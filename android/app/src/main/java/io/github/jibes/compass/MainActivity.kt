package io.github.jibes.compass

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.WindowManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import kotlin.math.atan2
import kotlin.math.min

/**
 * Thin native shell around the web app in /web. Adds what browsers can't:
 * fused rotation-vector heading with calibration status and system haptics.
 * True-north declination comes from the bundled WMM2025 model (web/wmm.js).
 */
class MainActivity : ComponentActivity(), SensorEventListener {

    private lateinit var webView: WebView
    private lateinit var sensors: SensorManager
    private var rotation: Sensor? = null
    private var magnetometer: Sensor? = null
    private val matrix = FloatArray(9)
    private var calibration = -1
    private var pageReady = false
    private var insetsJs = ""
    @Volatile private var insetsDp = floatArrayOf(0f, 0f)
    private var pendingGeo: Pair<String, GeolocationPermissions.Callback>? = null

    private val locationPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = result.values.any { it }
        pendingGeo?.let { (origin, callback) -> callback.invoke(origin, granted, false) }
        pendingGeo = null
    }

    private val assets by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        sensors = getSystemService(SENSOR_SERVICE) as SensorManager
        rotation = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        magnetometer = sensors.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)

        webView = WebView(this).apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.bg))
            isVerticalScrollBarEnabled = false
            overScrollMode = WebView.OVER_SCROLL_NEVER
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setGeolocationEnabled(true)
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            addJavascriptInterface(Bridge(), "AndroidCompass")
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assets.shouldInterceptRequest(request.url)

                override fun onPageFinished(view: WebView, url: String) {
                    pageReady = true
                    if (insetsJs.isNotEmpty()) view.evaluateJavascript(insetsJs, null)
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                    if (hasLocationPermission()) {
                        callback.invoke(origin, true, false)
                    } else {
                        pendingGeo = origin to callback
                        locationPermission.launch(
                            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                        )
                    }
                }
            }
        }

        // Edge-to-edge: hand system bar sizes to CSS as custom properties.
        ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val density = resources.displayMetrics.density
            insetsDp = floatArrayOf(bars.top / density, bars.bottom / density)
            insetsJs = "document.documentElement.style.setProperty('--inset-top','${bars.top / density}px');" +
                "document.documentElement.style.setProperty('--inset-bottom','${bars.bottom / density}px');"
            if (pageReady) (view as WebView).evaluateJavascript(insetsJs, null)
            WindowInsetsCompat.CONSUMED
        }

        setContentView(webView)
        if (savedInstanceState == null) webView.loadUrl("https://${WebViewAssetLoader.DEFAULT_DOMAIN}/index.html")
        else webView.restoreState(savedInstanceState)
    }

    private fun hasLocationPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    override fun onResume() {
        super.onResume()
        webView.onResume()
        rotation?.let { sensors.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
        magnetometer?.let { sensors.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
    }

    override fun onPause() {
        sensors.unregisterListener(this)
        webView.onPause()
        super.onPause()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_MAGNETIC_FIELD) {
            if (calibration < 0) calibration = event.accuracy
            return
        }
        if (!pageReady) return
        SensorManager.getRotationMatrixFromVector(matrix, event.values)
        // Device "up" axis (column 1) blended toward the rear axis (-column 2) as the
        // phone is raised, mirroring headingFromAxes() in web/geo.js.
        val uE = matrix[1]; val uN = matrix[4]
        val h2 = min(1f, uE * uE + uN * uN)
        val w = (1 - h2) * (1 - h2)
        val e = uE - w * matrix[2]
        val n = uN - w * matrix[5]
        if (e * e + n * n < 1e-10f) return
        val heading = Math.toDegrees(atan2(e, n).toDouble())
        val accuracy = if (event.values.size > 4 && event.values[4] >= 0) Math.toDegrees(event.values[4].toDouble()) else -1.0
        webView.evaluateJavascript("window.Compass&&Compass.onNativeHeading($heading,$accuracy,$calibration)", null)
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {
        if (sensor.type == Sensor.TYPE_MAGNETIC_FIELD) calibration = accuracy
    }

    /** Exposed to JavaScript as window.AndroidCompass. Called on a WebView background thread. */
    inner class Bridge {
        @JavascriptInterface
        fun insets(): String = insetsDp.let { "{\"top\":${it[0]},\"bottom\":${it[1]}}" }

        @JavascriptInterface
        fun haptic(kind: String) {
            val effect = when {
                kind == "confirm" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> HapticFeedbackConstants.CONFIRM
                kind == "confirm" -> HapticFeedbackConstants.LONG_PRESS
                else -> HapticFeedbackConstants.CLOCK_TICK
            }
            webView.post { webView.performHapticFeedback(effect) }
        }
    }
}
