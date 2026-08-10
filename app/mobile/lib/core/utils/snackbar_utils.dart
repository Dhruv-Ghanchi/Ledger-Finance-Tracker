import 'package:flutter/material.dart';
import '../network/api_client.dart';

/// Shows a standardized Snackbar for API errors, extracting the message from the DioException.
void showApiErrorSnackbar(BuildContext context, dynamic error, {String fallback = 'An error occurred'}) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(apiErrorMessage(error, fallback: fallback)),
      behavior: SnackBarBehavior.floating,
      backgroundColor: Colors.red.shade800,
    ),
  );
}

/// Shows a standardized success Snackbar.
void showSuccessSnackbar(BuildContext context, String message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
      backgroundColor: const Color(0xFF10B981), // Green
    ),
  );
}

/// Shows a standardized information/default Snackbar.
void showInfoSnackbar(BuildContext context, String message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
