import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/utils/app_fonts.dart';
import '../../core/utils/premium.dart';
import 'premium_upgrade_sheet.dart';

class ProfileSettingsScreen extends ConsumerStatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  ConsumerState<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends ConsumerState<ProfileSettingsScreen> {
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  final _promoController = TextEditingController();
  String? _profilePicture;
  bool _busy = false;
  bool _redeeming = false;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).dbUser;
    final fbUser = ref.read(authProvider).firebaseUser;

    String initialName = user?['name'] ?? fbUser?.displayName ?? '';
    String initialPhone = user?['phone'] ?? '';
    _profilePicture = user?['profile_picture'] ?? fbUser?.photoURL;

    _nameController = TextEditingController(text: initialName);
    _phoneController = TextEditingController(text: initialPhone);
    _emailController = TextEditingController(text: fbUser?.email ?? user?['email'] ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _promoController.dispose();
    super.dispose();
  }

  Future<void> _redeemPromo() async {
    final code = _promoController.text.trim();
    if (code.isEmpty) return;
    setState(() => _redeeming = true);
    try {
      await ref.read(authProvider.notifier).syncWithBackend(promoCode: code);
      final dbUser = ref.read(authProvider).dbUser;
      final status = dbUser?['promo_status'];
      final message = switch (status) {
        'applied' => 'Promo code applied!',
        'exhausted' => 'This offer has ended.',
        'already_used' => "You've already redeemed a promo code.",
        _ => "That code isn't valid.",
      };
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
      if (status == 'applied') _promoController.clear();
    } finally {
      if (mounted) setState(() => _redeeming = false);
    }
  }

  Future<void> _handleSave() async {
    setState(() => _busy = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.put('/users/profile', data: {
        'name': _nameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'profile_picture': _profilePicture,
      });

      // Refresh the synced user doc so the profile changes stick.
      await ref.read(authProvider.notifier).syncWithBackend();

      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e, fallback: 'Failed to update profile'))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmDeleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete your account?'),
        content: const Text(
          'This permanently deletes your account and every entry, category, IOU, and payment record '
          'tied to it, and cancels any active subscription. This action cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yes, delete everything', style: TextStyle(color: Color(0xFFDC2626))),
          ),
        ],
      ),
    );
    if (confirmed == true) _deleteAccount();
  }

  Future<void> _deleteAccount() async {
    setState(() => _deleting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.delete('/users/me');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Your account and all data have been deleted')),
        );
      }
      await ref.read(authProvider.notifier).logout();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e, fallback: 'Failed to delete account. Please try again or contact support.'))),
        );
      }
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  Future<void> _pickImage() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        withData: true,
      );
      if (result == null || result.files.isEmpty) return;

      final file = result.files.single;
      final bytes = file.bytes;
      if (bytes == null) return;

      if (file.size > 2 * 1024 * 1024) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Image must be smaller than 2MB')));
        return;
      }

      // Base64 data URL, same as the web app's FileReader.readAsDataURL.
      final ext = (file.extension ?? 'png').toLowerCase();
      final mime = ext == 'jpg' || ext == 'jpeg' ? 'image/jpeg' : ext == 'webp' ? 'image/webp' : 'image/png';
      setState(() {
        _profilePicture = 'data:$mime;base64,${base64Encode(bytes)}';
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not pick an image. Please try again.')));
    }
  }

  ImageProvider? _avatarImage() {
    final pic = _profilePicture;
    if (pic == null || pic.isEmpty) return null;
    if (pic.startsWith('http')) return NetworkImage(pic);
    if (pic.startsWith('data:image')) {
      final base64 = pic.substring(pic.indexOf(',') + 1);
      return MemoryImage(base64Decode(base64));
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final userState = ref.watch(authProvider);
    final dbUser = userState.dbUser;
    final hasPremium = hasPremiumAccess(dbUser);
    final avatarImage = _avatarImage();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile Settings', style: TextStyle(fontFamily: AppFonts.display, fontWeight: FontWeight.bold)),
        backgroundColor: theme.colorScheme.surface,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Profile Picture
            Center(
              child: Stack(
                alignment: Alignment.bottomRight,
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.1),
                    backgroundImage: avatarImage,
                    child: avatarImage == null
                        ? Text(
                            _nameController.text.isNotEmpty ? _nameController.text[0].toUpperCase() : 'U',
                            style: TextStyle(fontSize: 32, color: theme.colorScheme.primary),
                          )
                        : null,
                  ),
                  GestureDetector(
                    onTap: _pickImage,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: theme.colorScheme.surface, width: 2),
                      ),
                      child: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Form
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Full Name',
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _emailController,
              readOnly: true,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined),
                helperText: 'Email cannot be changed here.',
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(
                labelText: 'Phone Number',
                prefixIcon: Icon(Icons.phone_outlined),
                hintText: '+91 XXXXX XXXXX',
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 32),

            // Subscription
            Text('SUBSCRIPTION', style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 1.2, color: Colors.grey)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: theme.dividerColor),
              ),
              child: Column(
                children: [
                  _buildSubRow('Current Plan', planLabel(dbUser), theme),
                  const SizedBox(height: 12),
                  if (isPaidPlan(dbUser)) ...[
                    _buildSubRow(
                      'Status',
                      (dbUser?['subscription_expiry'] != null &&
                              DateTime.tryParse(dbUser!['subscription_expiry'].toString())?.isAfter(DateTime.now()) == true)
                          ? 'ACTIVE'
                          : 'INACTIVE',
                      theme,
                    ),
                    const SizedBox(height: 12),
                  ],
                  _buildSubRow('Expires', planExpiry(dbUser), theme),
                  const SizedBox(height: 16),
                  if (!hasPremium) ...[
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (ctx) => const PremiumUpgradeSheet(),
                          );
                        },
                        icon: const Icon(Icons.star, color: Colors.amber),
                        label: const Text('Upgrade to Premium'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.amber.shade700,
                          side: BorderSide(color: Colors.amber.shade200),
                          backgroundColor: Colors.amber.shade50,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _promoController,
                            textCapitalization: TextCapitalization.characters,
                            decoration: const InputDecoration(
                              isDense: true,
                              hintText: 'Have a promo code?',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _redeeming ? null : _redeemPromo,
                            child: _redeeming
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Redeem'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _busy ? null : _handleSave,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Changes'),
            ),

            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFDC2626).withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Danger Zone', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFDC2626), fontSize: 16)),
                  const SizedBox(height: 8),
                  const Text(
                    'Permanently delete your account and all associated data — entries, categories, IOUs, '
                    'subscription and payment history. This cannot be undone.',
                    style: TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: _deleting ? null : _confirmDeleteAccount,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFDC2626)),
                    ),
                    child: _deleting
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFDC2626)))
                        : const Text('Delete My Account'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubRow(String label, String value, ThemeData theme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
        Text(value, style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold)),
      ],
    );
  }
}
