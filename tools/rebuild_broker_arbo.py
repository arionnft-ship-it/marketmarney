#!/usr/bin/env python3
"""Patch the approved MarketMarney storyboard with a native Indonesian ONNX voice.
All generated speech is original synthesis; never reuse the old robotic recording.
"""
from pathlib import Path
import re

script=Path("neural-project/render_neural.py")
source=script.read_text("utf-8")
start=source.index("# Native Indonesian pronunciation using Google Translate TTS (gTTS).")
end=source.index("for i,(title,txt) in enumerate(SPEECH):\n aud=AudioSegment.from_file", start)
replacement="""# Native Indonesian offline ONNX broadcaster voice (ArboTTS, MIT).
# Keep one voice across chapters, let sentences breathe, no external TTS calls.
import re
from arbotts import ArboTTS
engine=ArboTTS(tier="standard")
VOICE='Arbo Indonesian native broadcast narrator'
clips=[]
for i,(title,txt) in enumerate(SPEECH):
 pieces=[]
 sentences=[s.strip() for s in re.split(r'(?<=[.!?])\\s+',txt) if s.strip()]
 for j,sentence in enumerate(sentences):
  path=OUT/f'arbo_{i:02d}_{j:02d}.wav'
  duration=engine.speak(sentence,output_file=path,lang='id',speaker='arbo',speed=0.87)
  if not path.exists() or path.stat().st_size<1000 or duration<0.3:
   raise RuntimeError('Missing Indonesian native voice: '+title)
  chunk=AudioSegment.from_file(path).set_frame_rate(48000).set_channels(2)
  if j:
   pieces.append(AudioSegment.silent(duration=210,frame_rate=48000).set_channels(2))
  pieces.append(chunk)
 voice_clip=AudioSegment.empty()
 for part in pieces: voice_clip+=part
 voice_clip.export(OUT/f'voice_{i:02d}.wav',format='wav')
 print('INDONESIAN_ARBO_SCENE',i,title,'seconds',round(len(voice_clip)/1000,2),flush=True)
"""
source=source[:start]+replacement+source[end:]
source=source.replace("AudioSegment.from_file(OUT/f'voice_{i:02d}.mp3')","AudioSegment.from_file(OUT/f'voice_{i:02d}.wav')")
# No ambient bed: intelligible narration has priority.
source=source.replace("base=chord*slow*np.maximum(fade,0)*0.006","base=chord*slow*np.maximum(fade,0)*0.0")

spoken=[
("JANGAN ASAL DEPOSIT",
"Sebelum memilih broker, jangan terburu-buru menyetor uang. Bonus besar, janji untung, dan tawaran yang terlalu menarik bukan bukti bahwa broker itu aman. Pelajari dulu siapa perusahaan yang menerima danamu."),
("KENALI PERAN BROKER",
"Broker adalah perantara untuk melakukan transaksi pada produk keuangan. Tampilan aplikasi yang profesional tidak otomatis berarti perusahaan memiliki izin. Cari tahu nama perusahaannya, produk yang ditawarkan, dan cara kerjanya."),
("PERIKSA LEGALITAS",
"Untuk pialang berjangka di Indonesia, periksa izin perusahaan melalui situs resmi Bappebti. Untuk jenis produk lain, lembaga pengawasnya bisa berbeda, seperti OJK atau Bank Indonesia. Cocokkan nama badan hukum, nomor izin, dan alamat situsnya."),
("PAHAMI SEMUA BIAYA",
"Jangan hanya melihat biaya deposit. Periksa selisih harga beli dan jual, yang disebut spread. Perhatikan juga komisi, biaya inap posisi, biaya penarikan, dan ketentuan akun. Biaya tersebut dapat mengurangi hasil transaksi."),
("HATI-HATI LEVERAGE",
"Leverage memungkinkan posisi transaksi lebih besar dibandingkan modal yang dipakai. Namun, kerugian juga bisa membesar saat harga bergerak berlawanan. Sebelum trading, tentukan ukuran posisi yang wajar dan batas kerugian."),
("LINDUNGI DANA",
"Pastikan rekening penerima dana benar-benar resmi. Baca aturan penyimpanan dana nasabah, pengaduan, deposit, dan penarikan. Gunakan akun demo untuk latihan. Jika mulai menggunakan uang asli, pakai nominal kecil dan pahami prosedur penarikannya."),
("KENALI TANDA BAHAYA",
"Hentikan proses jika broker menjanjikan keuntungan pasti, mendesak kamu segera transfer, atau meminta uang ke rekening pribadi yang tidak jelas. Jangan berikan kata sandi maupun kode OTP. Waspadai permintaan biaya tambahan yang tidak masuk akal untuk mencairkan dana."),
("PILIH DENGAN BIJAK",
"Bayangkan Broker A menjanjikan keuntungan lima persen setiap hari, tetapi izinnya tidak jelas. Broker B menjelaskan badan hukum, biaya, dan proses penarikan yang bisa diperiksa. Broker B lebih layak diteliti, tetapi tetap tidak menjamin keuntungan. Periksa dulu, pahami risikonya, baru putuskan. MarketMarney TV.")
]
assert len(spoken)==8
values="SPEECH="+repr(spoken)
anchor="# Native Indonesian offline ONNX broadcaster voice (ArboTTS, MIT)."
assert anchor in source
source=source.replace(anchor,values+"\n"+anchor,1)
script.write_text(source,"utf-8")
print("PATCH_OK scenes",len(spoken),"bytes",len(source),flush=True)
