import 'package:flutter_riverpod/flutter_riverpod.dart';

enum WorkspaceScope {
  personal('personal', 'Personal'),
  business('business', 'Business');

  final String id;
  final String label;

  const WorkspaceScope(this.id, this.label);
}

/// Provides the globally active workspace (Personal or Business).
/// Defaults to Personal.
final workspaceProvider = StateProvider<WorkspaceScope>((ref) {
  return WorkspaceScope.personal;
});
