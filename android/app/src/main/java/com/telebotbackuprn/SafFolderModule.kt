package com.telebotbackuprn

import android.net.Uri
import android.provider.DocumentsContract
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments
import java.io.File

/**
 * Lists the entries of a SAF folder picked with ACTION_OPEN_DOCUMENT_TREE.
 * `pickDirectory()` hands back a `content://` tree URI that the blob-util fs
 * walker cannot read; this resolves each child through DocumentsContract so
 * the scanner gets real display names, sizes and mtimes.
 */
class SafFolderModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "SafFolder"

  private data class Entry(
    val path: String,
    val name: String,
    val size: Long,
    val modifiedAt: Long,
  )

  @ReactMethod
  fun list(treeUri: String, promise: Promise) {
    try {
      val context = reactApplicationContext
      val tree = Uri.parse(treeUri)
      val root = DocumentsContract.buildDocumentUriUsingTree(
        tree,
        DocumentsContract.getTreeDocumentId(tree),
      ) ?: return promise.reject("EINVAL", "Bukan folder URI yang sah.")

      val out = Arguments.createArray()
      walk(context, root, out, 0)
      promise.resolve(out)
    } catch (security: SecurityException) {
      // The OS revoked the SAF grant (or the tree moved), so listing throws
      // "Permission Denial ... ACTION_OPEN_DOCUMENT". Surface it with a stable
      // code the JS scanner recognises to mark the folder invalid instead of
      // burying it in a generic error.
      promise.reject("EPERMDENIED", security.message, security)
    } catch (error: Exception) {
      promise.reject("EUNSPECIFIED", error.message, error)
    }
  }

  private fun walk(
    context: ReactApplicationContext,
    documentUri: Uri,
    out: WritableArray,
    depth: Int,
  ) {
    if (depth > MAX_DEPTH || out.size() >= MAX_ENTRIES) {
      return
    }
    val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
      documentUri,
      DocumentsContract.getDocumentId(documentUri),
    )
    val projection = arrayOf(
      DocumentsContract.Document.COLUMN_DOCUMENT_ID,
      DocumentsContract.Document.COLUMN_DISPLAY_NAME,
      DocumentsContract.Document.COLUMN_MIME_TYPE,
      DocumentsContract.Document.COLUMN_SIZE,
      DocumentsContract.Document.COLUMN_LAST_MODIFIED,
      DocumentsContract.Document.COLUMN_FLAGS,
    )
    context.contentResolver.query(childrenUri, projection, null, null, null)?.use { cursor ->
      while (cursor.moveToNext() && out.size() < MAX_ENTRIES) {
        val documentId = cursor.getString(0)
        val name = cursor.getString(1) ?: continue
        val mime = cursor.getString(2)
        val isDir = mime == DocumentsContract.Document.MIME_TYPE_DIR
        val uri = DocumentsContract.buildDocumentUriUsingTree(documentUri, documentId)
        if (isDir) {
          walk(context, uri, out, depth + 1)
        } else {
          val entry = Arguments.createMap()
          // A real file path when the provider exposes one, else the document
          // URI; the upload path localizes `content://` either way.
          val filePath = physicalPathOrNull(uri)
          entry.putString("path", filePath ?: uri.toString())
          entry.putString("displayName", name)
          entry.putDouble("size", cursor.getLong(3).coerceAtLeast(0).toDouble())
          entry.putDouble("modifiedAt", cursor.getLong(4).coerceAtLeast(0).toDouble())
          out.pushMap(entry)
        }
      }
    }
  }

  private fun physicalPathOrNull(documentUri: Uri): String? {
    val id = DocumentsContract.getDocumentId(documentUri)
    val colon = id.indexOf(':')
    if (colon < 0) {
      return null
    }
    val relative = id.substring(colon + 1)
    val primary = File("/storage/emulated/0")
    if (!primary.isDirectory) {
      return null
    }
    return File(primary, relative).absolutePath
  }

  private companion object {
    const val MAX_DEPTH = 12
    const val MAX_ENTRIES = 20_000
  }
}
