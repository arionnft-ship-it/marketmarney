import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.*;
import java.util.jar.*;
import java.util.zip.*;
import java.nio.charset.StandardCharsets;
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

    // aapt2's Resources.proto, XmlNode.element(1), XmlElement.attribute(4).
    // AAB stores the manifest as protobuf XML, not textual XML.
    record Field(int tag, byte[] bytes, long number) {
        long value() { return number; }
        String text() { return new String(bytes, StandardCharsets.UTF_8); }
    }

    static long varint(InputStream in) throws IOException {
        long result = 0;
        for (int shift = 0; shift < 64; shift += 7) {
            int item = in.read();
            if (item < 0) throw new EOFException();
            result |= (long)(item & 127) << shift;
            if ((item & 128) == 0) return result;
        }
        throw new IOException("Varint Android manifest tidak valid");
    }

    static List<Field> fields(byte[] message) throws IOException {
        List<Field> output = new ArrayList<>();
        ByteArrayInputStream input = new ByteArrayInputStream(message);
        while (input.available() > 0) {
            long key = varint(input);
            int tag = Math.toIntExact(key >>> 3), wire = (int)(key & 7);
            if (wire == 0) {
                output.add(new Field(tag, null, varint(input)));
            } else if (wire == 2) {
                int size = Math.toIntExact(varint(input));
                require(size >= 0 && size <= input.available(), "Panjang data manifest tidak valid");
                output.add(new Field(tag, input.readNBytes(size), 0));
            } else if (wire == 1 || wire == 5) {
                input.skipNBytes(wire == 1 ? 8 : 4);
            } else throw new IOException("Tipe data manifest tidak dikenal");
        }
        return output;
    }

    static Optional<Field> find(List<Field> fields, int tag) {
        return fields.stream().filter(f -> f.tag() == tag).findFirst();
    }

    static Map<String,String> manifestIdentity(ZipFile archive) throws Exception {
        byte[] node;
        try (var stream = archive.getInputStream(archive.getEntry("base/manifest/AndroidManifest.xml"))) {
            node = stream.readNBytes(8 * 1024 * 1024);
            require(stream.read() == -1, "Android manifest terlalu besar");
        }
        List<Field> element = fields(find(fields(node), 1).orElseThrow().bytes());
        require("manifest".equals(find(element, 3).orElseThrow().text()), "Root manifest tidak valid");
        Map<String,String> result = new HashMap<>();
        for (Field attribute : element) {
            if (attribute.tag() != 4) continue;
            List<Field> attr = fields(attribute.bytes());
            String name = find(attr, 2).orElseThrow().text();
            String namespace = find(attr, 1).map(Field::text).orElse("");
            if (!(name.equals("package") && namespace.isEmpty()) &&
                !(Set.of("versionCode", "versionName").contains(name) &&
                  "http://schemas.android.com/apk/res/android".equals(namespace))) continue;
            String value = find(attr, 3).map(Field::text).orElse("");
            if (value.isEmpty()) {
                List<Field> item = fields(find(attr, 6).orElseThrow().bytes());
                if (name.equals("versionCode")) {
                    List<Field> primitive = fields(find(item, 7).orElseThrow().bytes());
                    value = Long.toString(find(primitive, 6).or(() -> find(primitive, 7)).orElseThrow().value());
                } else {
                    byte[] string = find(item, 2).or(() -> find(item, 3)).orElseThrow().bytes();
                    value = find(fields(string), 1).orElseThrow().text();
                }
            }
            require(result.put(name, value) == null, "Identitas duplikat di manifest");
        }
        require("com.marketmarney.mobile".equals(result.get("package")) &&
                "4.38.5".equals(result.get("versionName")) && "48".equals(result.get("versionCode")),
                "Identitas paket atau versi bukan kandidat MarketMarney 4.38.5 (48)");
        return result;
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
        Map<String,String> identity;
        Set<String> seen = new HashSet<>();
        try (JarFile result = new JarFile(signed.toFile(), true)) {
            identity = manifestIdentity(result);
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
        System.out.println("applicationId=" + identity.get("package"));
        System.out.println("versionName=" + identity.get("versionName"));
        System.out.println("versionCode=" + identity.get("versionCode"));
        System.out.println("verifiedEntries=" + checked);
        System.out.println("uploadCertificateSubject=" + key.getSubjectX500Principal());
        System.out.println("uploadCertificateSHA256=" + HexFormat.ofDelimiter(":").withUpperCase().formatHex(
                MessageDigest.getInstance("SHA-256").digest(key.getEncoded())));
        System.out.println("signedAAB_SHA256=" + digest(Files.newInputStream(signed)));
    }
}
