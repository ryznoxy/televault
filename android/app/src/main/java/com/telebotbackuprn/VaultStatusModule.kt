package com.telebotbackuprn

import android.content.ComponentName
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * App-level status the JS side cannot read on its own:
 *
 * - the installed version, straight from PackageManager (the same number the
 *   installer uses to reject a downgrade). React Native's Platform.constants
 *   carries neither versionName nor versionCode on Android, which is why the
 *   updater used to believe every install was current.
 * - an ongoing status notification with no foreground service attached: the
 *   notification survives the process, costs no battery, and cannot be swiped
 *   away. A permanent dataSync foreground service is not an option on target
 *   SDK 36 (Android 15 caps those at 6 hours a day).
 * - the exact alarm that wakes the scheduled run, in its alarm-clock form so
 *   Doze and OEM battery managers treat it as user-visible. Android 12+ refuses
 *   a foreground service started from the background, but an exact alarm is one
 *   of the exemptions, so the alarm is what makes a 2 AM run possible at all.
 * - the battery-optimization exemption state and the intents that reach it,
 *   plus the per-OEM autostart settings screens no JS API exposes.
 */
class VaultStatusModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "VaultStatus"

  override fun getConstants(): Map<String, Any> {
    val info = reactApplicationContext.packageManager
      .getPackageInfo(reactApplicationContext.packageName, 0)
    return mapOf(
      "versionName" to (info.versionName ?: ""),
      // Double, not Long: the bridge converts numbers as doubles and a Long
      // constant comes through as undefined on some RN versions.
      "versionCode" to versionCodeOf(info),
      "manufacturer" to Build.MANUFACTURER,
    )
  }

  private fun versionCodeOf(info: android.content.pm.PackageInfo): Double =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      info.longVersionCode.toDouble()
    } else {
      @Suppress("DEPRECATION")
      info.versionCode.toDouble()
    }

  @ReactMethod
  fun showStatus(title: String, body: String) {
    StatusNotification.show(reactApplicationContext, StatusNotification.STATUS_ID, title, body)
  }

  @ReactMethod
  fun hideStatus() {
    StatusNotification.cancel(reactApplicationContext, StatusNotification.STATUS_ID)
  }

  /** Progress line of a scheduled run, whose service this app starts itself. */
  @ReactMethod
  fun showRunProgress(text: String) {
    StatusNotification.show(
      reactApplicationContext,
      StatusNotification.RUN_ID,
      "Backup berjalan",
      text,
      withStop = true,
    )
  }

  @ReactMethod
  fun hideRunProgress() {
    StatusNotification.cancel(reactApplicationContext, StatusNotification.RUN_ID)
  }

  /** Points the next wake-up at the given hour, today if it has not passed yet. */
  @ReactMethod
  fun scheduleExactAlarm(hour: Int) {
    ExactAlarm.schedule(reactApplicationContext, hour)
  }

  @ReactMethod
  fun cancelExactAlarm() {
    ExactAlarm.cancel(reactApplicationContext)
  }

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    val power = reactApplicationContext.getSystemService(PowerManager::class.java)
    promise.resolve(power?.isIgnoringBatteryOptimizations(reactApplicationContext.packageName) ?: false)
  }

  /**
   * True when the active network is not metered (Wi-Fi, Ethernet). The backup
   * rule "upload only on Wi-Fi" is enforced in JS before any upload, because
   * JobScheduler's unmetered constraint does not cover the exact-alarm path or
   * a manual run.
   */
  @ReactMethod
  fun isUnmetered(promise: Promise) {
    val manager = reactApplicationContext.getSystemService(ConnectivityManager::class.java)
    val network = manager?.activeNetwork
    val caps = if (manager != null && network != null) {
      manager.getNetworkCapabilities(network)
    } else {
      null
    }
    promise.resolve(
      caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) == true,
    )
  }

  @ReactMethod
  fun requestIgnoreBatteryOptimizations() {
    val ask = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
      .setData(Uri.parse("package:${reactApplicationContext.packageName}"))
    val list = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
    open(ask, list)
  }

  @ReactMethod
  fun openAutostartSettings() {
    for (component in AUTOSTART_SCREENS) {
      val intent = Intent().setComponent(component)
      if (reactApplicationContext.packageManager.resolveActivity(intent, 0) != null) {
        if (open(intent, null)) {
          return
        }
      }
    }
    val appDetails = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
      .setData(Uri.parse("package:${reactApplicationContext.packageName}"))
    open(appDetails, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
  }

  /** Starts `intent`; on failure tries `fallback` when one is given. */
  private fun open(intent: Intent, fallback: Intent?): Boolean {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return try {
      reactApplicationContext.startActivity(intent)
      true
    } catch (_: Exception) {
      if (fallback == null) {
        false
      } else {
        fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
          reactApplicationContext.startActivity(fallback)
          true
        } catch (_: Exception) {
          false
        }
      }
    }
  }

  private companion object {
    /**
     * Autostart screens per OEM. Android gives apps no API to enable autostart;
     * the best we can do is land the user on the exact screen instead of making
     * them hunt through Settings.
     */
    val AUTOSTART_SCREENS = listOf(
      ComponentName(
        "com.miui.securitycenter",
        "com.miui.permcenter.autostart.AutoStartManagementActivity",
      ),
      ComponentName(
        "com.coloros.safecenter",
        "com.coloros.safecenter.permission.startup.StartupAppListActivity",
      ),
      ComponentName(
        "com.oppo.safe",
        "com.oppo.safe.permission.startup.StartupAppListActivity",
      ),
      ComponentName(
        "com.oneplus.security",
        "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity",
      ),
      ComponentName(
        "com.huawei.systemmanager",
        "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
      ),
      ComponentName(
        "com.samsung.android.lool",
        "com.samsung.android.sm.ui.battery.BatteryActivity",
      ),
    )
  }
}
