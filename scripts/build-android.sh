#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
SDK="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
JDK="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
BT="$SDK/build-tools/35.0.0"
export JAVA_HOME="$JDK"
export PATH="$JDK/bin:$PATH"
OUT="$PWD/build/android"
mkdir -p "$OUT/classes" "$OUT/dex" "$OUT/assets/web" "$OUT/assets/sample" dist
cp web/* "$OUT/assets/web/"
cp -R sample/Notes "$OUT/assets/sample/"
"$BT/aapt2" link -o "$OUT/base.apk" --manifest android/AndroidManifest.xml -I "$SDK/platforms/android-35/android.jar" -A "$OUT/assets"
javac --release 17 -classpath "$SDK/platforms/android-35/android.jar" -d "$OUT/classes" android/src/dev/localnotes/*.java
find "$OUT/classes" -name '*.class' > "$OUT/classes.list"
"$BT/d8" --lib "$SDK/platforms/android-35/android.jar" --min-api 26 --output "$OUT/dex" @"$OUT/classes.list"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes.dex)
"$BT/zipalign" -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
# Development key only. Never use this script for release signing.
KEY="$PWD/build/dev.keystore"
if [ ! -f "$KEY" ]; then
  keytool -genkeypair -keystore "$KEY" -storepass android -keypass android -alias localnotes -keyalg RSA -validity 3650 -dname 'CN=Local Notes Development'
fi
"$BT/apksigner" sign --ks "$KEY" --ks-key-alias localnotes --ks-pass pass:android --key-pass pass:android --out dist/LocalNotes-debug.apk "$OUT/aligned.apk"
"$BT/apksigner" verify dist/LocalNotes-debug.apk
echo "$PWD/dist/LocalNotes-debug.apk"
