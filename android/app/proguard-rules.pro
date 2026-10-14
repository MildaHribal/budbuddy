# App code: plugins and widgets are loaded by name (capacitor.plugins.json, manifest).
-keep class eu.budbuddy.app.** { *; }

# Capacitor bridge and plugins resolve classes and methods via reflection.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class io.capawesome.capacitorjs.** { *; }
-keep class com.getcapacitor.community.** { *; }

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
