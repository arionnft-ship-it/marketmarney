import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.*;
import java.util.jar.*;
import java.util.zip.*;
import javax.naming.ldap.LdapName;

/** Check that the signed bundle still contains every byte validated by Android release CI. */
public class VerifyUpload {
    static final HexFormat HEX = HexFormat.of().withUpperCase();

    static boolean signatureMetadata(String name) {
        String n = name.toUpperCase(Locale.ROOT);
        if (!n.startsWith("META-INF/")) return false;
        String leaf = n.substring(9);
        return leaf.equals("MANIFEST.MF") || (!leaf.contains("/") &&
                (leaf.endsWith(".SF") || leaf.endsWith(".RSA") || leaf.endsWith(".EC") ||
                 leaf.endsWith(".DSA") || leaf.startsWith("SIG-")));
    }

    static String digest(InputStream stream) throws Exception {
        try (stream) {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[65536];
            int size;
            while ((size = stream.read(buffer)) != -1) md.update(buffer, 0, size);
            return HEX.formatHex(md.digest());
        }
    }

    static void require(boolean ok, String message) {
        if (!ok) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 4) throw new IllegalArgumentException("unsigned.aab signed.aab upload.der expected-unsigned-sha256");
        Path unsigned = Path.of(args[0]), signed = Path.of(args[1]);
        String expected = args[3].trim();
        require(expected.matches("(?i)[0-9a-f]{64}"), "Checksum CI tidak valid");
        require(digest(Files.newInputStream(unsigned)).equalsIgnoreCase(expected), "Checksum AAB asal berbeda");
        X509Certificate key;
        try (InputStream der = Files.newInputStream(Path.of(args[2]))) {
            key = (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(der);
        }
        key.checkValidity();
        for (var rdn : new LdapName(key.getSubjectX500Principal().getName()).getRdns()) {
            require(!(rdn.getType().equalsIgnoreCase("CN") && "Android Debug".equalsIgnoreCase(rdn.getValue().toString())),
                    "Kunci Android Debug tidak dapat digunakan");
        }
        Map<String,String> original = new HashMap<>();
        try (ZipFile input = new ZipFile(unsigned.toFile())) {
            for (var it = input.entries(); it.hasMoreElements();) {
                var entry = it.nextElement();
                if (entry.isDirectory() || signatureMetadata(entry.getName())) continue;
                require(original.put(entry.getName(), digest(input.getInputStream(entry))) == null, "Nama file duplikat");
            }
        }
        require(original.containsKey("base/manifest/AndroidManifest.xml") && original.containsKey("BundleConfig.pb"),
                "Berkas masukan bukan Android App Bundle");
        int checked = 0;
        Set<String> seen = new HashSet<>();
        try (JarFile result = new JarFile(signed.toFile(), true)) {
            for (var it = result.entries(); it.hasMoreElements();) {
                JarEntry entry = it.nextElement();
                if (entry.isDirectory()) continue;
                String name = entry.getName();
                require(seen.add(name), "Nama file ganda di hasil");
                if (signatureMetadata(name)) continue;
                String sha = digest(result.getInputStream(entry)); // Reading to EOF triggers JDK signature verification.
                require(sha.equals(original.remove(name)), "Isi AAB berubah: " + name);
                CodeSigner[] signers = entry.getCodeSigners();
                require(signers != null && signers.length == 1 &&
                        key.equals(signers[0].getSignerCertPath().getCertificates().get(0)),
                        "Isi AAB tanpa tanda tangan upload yang sesuai: " + name);
                checked++;
            }
        }
        require(original.isEmpty(), "Sebagian isi AAB hilang");
        System.out.println("applicationId=com.marketmarney.mobile");
        System.out.println("versionName=4.38.5");
        System.out.println("versionCode=48");
        System.out.println("verifiedEntries=" + checked);
        System.out.println("uploadCertificateSubject=" + key.getSubjectX500Principal());
        System.out.println("uploadCertificateSHA256=" + HexFormat.ofDelimiter(":").withUpperCase().formatHex(
                MessageDigest.getInstance("SHA-256").digest(key.getEncoded())));
        System.out.println("signedAAB_SHA256=" + digest(Files.newInputStream(signed)));
    }
}
