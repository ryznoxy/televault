package com.telebotbackuprn

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageInfo
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
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
 * - the battery-optimization exemption state and the intents that reach it,
 *   plus the per-OEM autostart settings screens no JS API exposes.
 */
class VaultStatusModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "VaultStatus"

  override fun getConstants(): Map<String, Any> {
    val info: PackageInfo =
      reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, 0)
    return mapOf(
      "versionName" to (info.versionName ?: ""),
      // Double, not Long: the bridge converts numbers as doubles and a Long
      // constant comes through as undefined on some RN versions.
      "versionCode" to versionCodeOf(info),
      "manufacturer" to Build.MANUFACTURER,
    )
  }

  private fun versionCodeOf(info: PackageInfo): Double =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      info.longVersionCode.toDouble()
    } else {
      @Suppress("DEPRECATION")
      info.versionCode.toDouble()
    }

  @ReactMethod
  fun showStatus(title: String, body: String) {
    ensureChannel()
    val launch = reactApplicationContext.packageManager
      .getLaunchIntentForPackage(reactApplicationContext.packageName)
    val pending = launch?.let {
      PendingIntent.getActivity(
        reactApplicationContext,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
    val notification = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_vault)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(pending)
      .build()
    try {
      NotificationManagerCompat.from(reactApplicationContext).notify(NOTIFICATION_ID, notification)
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS denied: background work still runs, just silently.
    }
  }

  @ReactMethod
  fun hideStatus() {
    try {
      NotificationManagerCompat.from(reactApplicationContext).cancel(NOTIFICATION_ID)
    } catch (_: SecurityException) {
      // Same as above: nothing to do when notifications are blocked.
    }
  }

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    val power = reactApplicationContext.getSystemService(PowerManager::class.java)
    promise.resolve(power?.isIgnoringBatteryOptimizations(reactApplicationContext.packageName) ?: false)
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

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = reactApplicationContext.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Status TeleVault",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Menampilkan bahwa backup otomatis TeleVault aktif"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private companion object {
    const val CHANNEL_ID = "televault_status"
    const val NOTIFICATION_ID = 4101

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
