plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.sinaaty"
    compileSdk = flutter.compileSdkVersion

    // AGP 9 turns resValues off by default; our three flavors name the app through it
    // (صناعتي / للشركاء / للأساطيل), so it must be opted back in.
    buildFeatures { resValues = true }
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.example.sinaaty"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    flavorDimensions += "app"
    productFlavors {
        create("customer") { dimension = "app"; applicationIdSuffix = ".customer"; resValue("string", "app_name", "صناعتي") }
        create("partner") { dimension = "app"; applicationIdSuffix = ".partner"; resValue("string", "app_name", "صناعتي للشركاء") }
        create("fleet") { dimension = "app"; applicationIdSuffix = ".fleet"; resValue("string", "app_name", "صناعتي للأساطيل") }
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

// A flavourless `flutter run` (the command everyone types first, and every IDE's default green
// arrow) asks Gradle for `assembleDebug`. With product flavours that task builds every variant and
// writes app-customer-debug.apk / app-partner-debug.apk / app-fleet-debug.apk — never the plain
// app-debug.apk Flutter then looks for, so the tool reports «built, but I couldn't find the file»
// and the developer is left hunting a phantom. Rather than expect everyone to remember --flavor,
// the customer build becomes the default: copied to the name Flutter expects. Naming a flavour
// explicitly (or ./run.sh) still builds just that one and is much faster.
androidComponents {
    onVariants { variant ->
        if (variant.flavorName == "customer" && variant.buildType == "debug") {
            afterEvaluate {
                tasks.named("assembleDebug") {
                    doLast {
                        val dir = File(rootProject.projectDir.parentFile, "build/app/outputs/flutter-apk")
                        val built = File(dir, "app-customer-debug.apk")
                        val expected = File(dir, "app-debug.apk")
                        if (built.exists()) {
                            built.copyTo(expected, overwrite = true)
                            logger.lifecycle("▸ نسخة العميل هي الافتراضية: app-customer-debug.apk → app-debug.apk (لبناء نكهة واحدة فقط استعمل ./run.sh)")
                        }
                    }
                }
            }
        }
    }
}
