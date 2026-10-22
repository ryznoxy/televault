package com.telebotbackuprn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** The run notification's "Hentikan" action. */
class RunStopReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    RunStop.request(context)
  }
}