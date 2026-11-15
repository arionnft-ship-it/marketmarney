[CmdletBinding()]
param(
    [string] $Keystore,
    [string] $Alias,
    [switch] $UsePasswordEnvironment
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$bundle = Join-Path $root 'MarketMarney-4.38.5-UNSIGNED.aab'
$output = Join-Path $root 'MarketMarney-4.38.5-SIGNED.aab'
$checksums = Join-Path $root 'SHA256SUMS.txt'
$staging = $null
$newKeyStage = $null
try {
    $tools = @{}
    foreach ($name in @('java','javac','jarsigner','keytool')) {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin/$name.exe"))) {
            $tools[$name] = Join-Path $env:JAVA_HOME "bin/$name.exe"
        } elseif ($command) {
            $tools[$name] = $command.Source
        } else { throw "Pasang JDK 17 atau lebih baru dan aktifkan PATH atau JAVA_HOME. Perintah yang diperlukan: $name" }
    }
    foreach ($path in @($bundle,$checksums,(Join-Path $root 'VerifyUpload.java'))) {
        if (!(Test-Path -LiteralPath $path -PathType Leaf)) { throw "Berkas belum ditemukan: $path. Ekstrak seluruh ZIP dahulu." }
    }
    if (Test-Path -LiteralPath $output) { throw "AAB hasil sudah ada. Pindahkan dahulu jika perlu membuat hasil baru." }
    $entries = @(Get-Content -LiteralPath $checksums | Where-Object { $_ -match '^([0-9a-fA-F]{64})\s+\*?MarketMarney-4\.38\.5-UNSIGNED\.aab$' })
    if ($entries.Count -ne 1) { throw 'Checksum AAB dari build Android tidak ditemukan.' }
    $expected = ($entries[0] -split '\s+')[0]
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $bundle).Hash -ne $expected) { throw 'AAB berbeda dari hasil pengujian Android. Ekstrak ulang ZIP asli.' }

    if (!$Keystore) {
        Write-Host '1  Gunakan kunci upload yang sudah dimiliki.'
        Write-Host '2  Buat kunci baru untuk aplikasi pertama yang belum memiliki kunci upload.'
        $choice = Read-Host 'Pilih 1 atau 2'
        if ($choice -eq '1') {
            $Keystore = (Read-Host 'Lokasi lengkap keystore (.jks atau .p12)').Trim('"')
        } elseif ($choice -eq '2') {
            $keyDir = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'MarketMarney'
            [void][IO.Directory]::CreateDirectory($keyDir)
            $Keystore = Join-Path $keyDir 'MarketMarney-Upload.p12'
            if (Test-Path -LiteralPath $Keystore) { throw "Kunci sudah ada di $Keystore. Gunakan pilihan 1." }
            $newKeyStage = Join-Path $keyDir ([Guid]::NewGuid().ToString() + '.p12')
            $Alias = 'marketmarney-upload'
            Write-Host 'Buat kata sandi kunci upload dan simpan di pengelola kata sandi. Saat mengetik, karakternya tidak ditampilkan.'
            & $tools['keytool'] -genkeypair -storetype PKCS12 -keystore $newKeyStage -alias $Alias -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=MarketMarney Upload'
            if ($LASTEXITCODE -ne 0) { throw 'Pembuatan kunci gagal.' }
            [IO.File]::Move($newKeyStage,$Keystore)
            Write-Host "Kunci tersimpan di $Keystore. Simpan salinan cadangannya di tempat pribadi."
        } else { throw 'Pilih angka 1 atau 2.' }
    }
    if (!(Test-Path -LiteralPath $Keystore -PathType Leaf)) { throw 'Keystore yang dipilih belum ditemukan.' }
    $Keystore = (Resolve-Path -LiteralPath $Keystore).ProviderPath
    if (!$Alias) { $Alias = Read-Host 'Masukkan alias kunci upload' }
    if ([string]::IsNullOrWhiteSpace($Alias)) { throw 'Alias diperlukan.' }
    $staging = Join-Path $root ('.marney-sign-' + [Guid]::NewGuid().ToString())
    [void][IO.Directory]::CreateDirectory($staging)
    $temporary = Join-Path $staging 'candidate.aab'
    $cert = Join-Path $staging 'upload.der'
    $storeArgs = @()
    $signArgs = @()
    if ($UsePasswordEnvironment) {
        if (!$env:MM_OWNER_STORE_PASS -or !$env:MM_OWNER_KEY_PASS) { throw 'Variabel kata sandi untuk pengujian otomatis belum tersedia.' }
        $storeArgs = @('-storepass:env','MM_OWNER_STORE_PASS')
        $signArgs = $storeArgs + @('-keypass:env','MM_OWNER_KEY_PASS')
    }
    & $tools['keytool'] -exportcert -keystore $Keystore -alias $Alias -file $cert @storeArgs
    if ($LASTEXITCODE -ne 0) { throw 'Sertifikat tidak dapat dibaca. Periksa alias dan kata sandi.' }
    & $tools['jarsigner'] -keystore $Keystore -digestalg SHA-256 -signedjar $temporary @signArgs $bundle $Alias
    if ($LASTEXITCODE -ne 0) { throw 'Penandatanganan gagal.' }
    & $tools['jarsigner'] -verify $temporary
    if ($LASTEXITCODE -ne 0) { throw 'Tanda tangan tidak dapat diverifikasi.' }
    $stdout = & $tools['java'] (Join-Path $root 'VerifyUpload.java') $bundle $temporary $cert $expected
    if ($LASTEXITCODE -ne 0) { throw 'Identitas penanda tangan atau integritas berkas hasil gagal diverifikasi.' }
    [IO.File]::Move($temporary,$output)
    $stdout | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $root 'Hasil-Verifikasi.txt')
    $stdout | ForEach-Object { Write-Host $_ }
    Write-Host "AAB siap untuk langkah unggah manual: $output"
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
} finally {
    if ($staging -and (Test-Path -LiteralPath $staging)) { Remove-Item -LiteralPath $staging -Recurse -Force }
    if ($newKeyStage -and (Test-Path -LiteralPath $newKeyStage)) { Remove-Item -LiteralPath $newKeyStage -Force }
}
