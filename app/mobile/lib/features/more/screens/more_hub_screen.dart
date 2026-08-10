import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../chat/ai_chat_sheet.dart';
import '../../settings/categories_manager_sheet.dart';
import '../../settings/export_sheet.dart';
import '../../settings/import_sheet.dart';
import '../../settings/premium_upgrade_sheet.dart';
import '../../settings/profile_settings_screen.dart';
import '../../../core/utils/fy.dart';
import '../../../core/providers/auth_provider.dart';
import 'dart:ui';

class MoreHubScreen extends ConsumerWidget {
  const MoreHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F9),
      appBar: AppBar(
        title: const Text('More', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 16.0),
        children: [
          // KOIN AI Premium Card
          InkWell(
            onTap: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (ctx) => const AiChatSheet(),
              );
            },
            borderRadius: BorderRadius.circular(24),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F0F10), Color(0xFF1C1C1E)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: const [
                        BoxShadow(color: Color(0x33000000), blurRadius: 16, offset: Offset(0, 8)),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                          ),
                          child: const Icon(Icons.auto_awesome, color: Color(0xFFF59E0B), size: 28),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text('KOIN AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20, letterSpacing: 1.2)),
                              SizedBox(height: 4),
                              Text('Your financial copilot', style: TextStyle(color: Color(0xFFA0A0A5), fontSize: 13, fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios, color: Color(0xFF64646A), size: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
          
          Text('FINANCE', style: TextStyle(color: const Color(0xFF64646A), fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.5)),
          const SizedBox(height: 12),
          _buildPremiumGroup(
            children: [
              _buildPremiumTile(context, Icons.category_outlined, 'Categories', () {
                showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => const CategoriesManagerSheet());
              }),
            ],
          ),
          
          const SizedBox(height: 24),
          Text('REPORTS & DATA', style: TextStyle(color: const Color(0xFF64646A), fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.5)),
          const SizedBox(height: 12),
          _buildPremiumGroup(
            children: [
              _buildPremiumTile(context, Icons.cloud_download_outlined, 'Export Data', () {
                showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => ExportSheet(fyStart: currentFYStart()));
              }, showBorder: true),
              _buildPremiumTile(context, Icons.document_scanner_outlined, 'Import Receipt', () {
                showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => const ImportSheet());
              }),
            ],
          ),
          
          const SizedBox(height: 24),
          Text('ACCOUNT', style: TextStyle(color: const Color(0xFF64646A), fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.5)),
          const SizedBox(height: 12),
          _buildPremiumGroup(
            children: [
              _buildPremiumTile(context, Icons.workspace_premium_outlined, 'Subscription & Premium', () {
                showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => const PremiumUpgradeSheet());
              }, showBorder: true),
              _buildPremiumTile(context, Icons.person_outline, 'Profile & Settings', () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => const ProfileSettingsScreen()));
              }),
            ],
          ),
          
          const SizedBox(height: 48),
          Center(
            child: TextButton.icon(
              onPressed: () {
                ref.read(authProvider.notifier).logout();
              },
              icon: const Icon(Icons.logout, color: Color(0xFFDC2626), size: 20),
              label: const Text('Log Out', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold)),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
            ),
          ),
          const SizedBox(height: 64),
        ],
      ),
    );
  }

  Widget _buildPremiumGroup({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E2E5), width: 1),
        boxShadow: const [BoxShadow(color: Color(0x05000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        children: children,
      ),
    );
  }

  Widget _buildPremiumTile(BuildContext context, IconData icon, String title, VoidCallback onTap, {bool showBorder = false}) {
    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          border: showBorder ? const Border(bottom: BorderSide(color: Color(0xFFF3F3F5), width: 1)) : null,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F7F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 22, color: const Color(0xFF18181B)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: Color(0xFF18181B))),
            ),
            const Icon(Icons.chevron_right, size: 20, color: Color(0xFFC4C4C8)),
          ],
        ),
      ),
    );
  }
}
