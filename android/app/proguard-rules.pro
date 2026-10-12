# Methods called from JavaScript must keep their names.
-keepclassmembers class io.github.jibes.compass.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
