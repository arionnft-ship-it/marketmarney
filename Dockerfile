FROM gradle:8.13.0-jdk17 AS build

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl file python3 unzip zip \
    && rm -rf /var/lib/apt/lists/*

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/35.0.0:$PATH

RUN mkdir -p /opt/android-sdk/cmdline-tools /tmp/android-tools \
    && curl -fL --retry 6 --retry-all-errors --connect-timeout 20 --max-time 300 \
       https://dl.google.com/android/repository/commandlinetools-linux-14742923_latest.zip \
       -o /tmp/android-tools.zip \
    && unzip -q /tmp/android-tools.zip -d /tmp/android-tools \
    && mv /tmp/android-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest \
    && rm -rf /tmp/android-tools /tmp/android-tools.zip \
    && yes | sdkmanager --licenses >/dev/null || true

RUN sdkmanager "platforms;android-36" "build-tools;35.0.0"

WORKDIR /src
COPY android-app ./android-app

RUN python3 android-app/apply-marney-v4.py \
    && python3 android-app/finalize-marney-v4.py

RUN mkdir -p android-app/app/src/main/res/mipmap-xxxhdpi \
    && ICON=android-app/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png python3 - <<'PY'
import os, struct, zlib
path=os.environ['ICON']; w=h=512
white=(255,255,255,255); black=(24,26,29,255); orange=(244,122,31,255)
px=[[white for _ in range(w)] for _ in range(h)]
def rect(x0,y0,x1,y1,c):
    for y in range(max(0,y0),min(h,y1)):
        row=px[y]
        for x in range(max(0,x0),min(w,x1)): row[x]=c
def line(x0,y0,x1,y1,width,c):
    steps=max(abs(x1-x0),abs(y1-y0),1)
    for i in range(steps+1):
        x=round(x0+(x1-x0)*i/steps); y=round(y0+(y1-y0)*i/steps)
        rect(x-width//2,y-width//2,x+width//2+1,y+width//2+1,c)
rect(82,112,142,404,black); rect(370,112,430,404,black)
line(120,126,256,300,54,black); line(392,126,256,300,54,black)
line(270,224,404,90,28,orange); line(404,90,404,180,28,orange); line(404,90,314,90,28,orange)
raw=b''.join(b'\x00'+b''.join(bytes(p) for p in row) for row in px)
def chunk(kind,data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
open(path,'wb').write(png)
PY

RUN cd android-app \
    && gradle --no-daemon --stacktrace :app:assembleDebug

RUN set -eux; \
    APK=android-app/app/build/outputs/apk/debug/app-debug.apk; \
    AAPT=/opt/android-sdk/build-tools/35.0.0/aapt; \
    test -s "$APK"; \
    mkdir -p /out; \
    "$AAPT" dump badging "$APK" | tee /out/Marney-v4-badging.txt; \
    "$AAPT" dump permissions "$APK" | tee /out/Marney-v4-permissions.txt; \
    grep -F "package: name='com.marketmarney.mobile'" /out/Marney-v4-badging.txt; \
    grep -F "versionCode='5'" /out/Marney-v4-badging.txt; \
    grep -F "versionName='4.0.0-beta'" /out/Marney-v4-badging.txt; \
    grep -F 'com.marketmarney.mobile.MainActivity' /out/Marney-v4-badging.txt; \
    grep -F 'android.permission.CAMERA' /out/Marney-v4-permissions.txt; \
    grep -F 'android.permission.RECORD_AUDIO' /out/Marney-v4-permissions.txt; \
    grep -F 'android.permission.INTERNET' /out/Marney-v4-permissions.txt; \
    unzip -p "$APK" classes.dex | grep -aF 'MARNEY_ANDROID_V4'; \
    unzip -p "$APK" classes.dex | grep -aF 'android-native-v4'; \
    unzip -p "$APK" classes.dex | grep -aF 'Ukuran maksimal setiap unggahan adalah 100 MB.'; \
    cp "$APK" /out/Marney-v4-Beta.apk; \
    cd /out; \
    sha256sum Marney-v4-Beta.apk | tee Marney-v4-Beta.sha256

FROM python:3.12-slim
WORKDIR /srv/marney
COPY --from=build /out/ ./
COPY android-app/apk-server.py /srv/marney/apk-server.py
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=6 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3).read()" || exit 1
CMD ["python3", "/srv/marney/apk-server.py"]
