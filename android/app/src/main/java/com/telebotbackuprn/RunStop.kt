package com.telebotbackuprn

import android.content.Context
import java.io.File

/**
 * The stop request a running backup polls for.
 *
 * The run can be in another JS runtime (this service's own, or the background
 * actions one), so nothing here can set a variable there. A file in the app's
 * private dir is the shared channel: Kotlin writes it, and the runner — whose
 * `DocumentDir` is the very same `filesDir` — checks it between chunks.
 */
internal object RunStop {
  private const val FLAG_NAME = "run_stop_request"

  fun request(context: Context) {
    try {
      File(context.filesDir, FLAG_NAME).writeText("1")
    } catch (_: Exception) {
      // Best effort: if the flag cannot be written the run simply keeps going.
    }
  }
}