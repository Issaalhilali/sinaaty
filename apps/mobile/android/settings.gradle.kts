pluginManagement {
    val flutterSdkPath =
        run {
            val properties = java.util.Properties()
            file("local.properties").inputStream().use { properties.load(it) }
            val flutterSdkPath = properties.getProperty("flutter.sdk")
            require(flutterSdkPath != null) { "flutter.sdk not set in local.properties" }
            flutterSdkPath
        }

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")

    repositories {
        // Google's mirror hosts only Android/AndroidX/Google artifacts. Left unfiltered it is
        // consulted for Kotlin too — a 404 on a good day, and on a flaky link a DNS failure that
        // aborts resolution instead of falling through (that is what broke this build).
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0"
    // خدمات Google: تقرأ google-services.json وتختار الجاذب المطابق لمعرّف النكهة.
    id("com.google.gms.google-services") version "4.4.2" apply false
    id("com.android.application") version "9.1.0" apply false
    id("org.jetbrains.kotlin.android") version "2.4.0" apply false
}

include(":app")
