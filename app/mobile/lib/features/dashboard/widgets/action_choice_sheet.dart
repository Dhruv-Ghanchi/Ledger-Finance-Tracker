import 'package:flutter/material.dart';
import '../../entries/add_entry_sheet.dart';
import '../../entries/add_debt_sheet.dart';
import '../../settings/import_sheet.dart';
import '../../settings/export_sheet.dart';
import '../../../core/utils/fy.dart';

class ActionChoiceSheet extends StatelessWidget {
  const ActionChoiceSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fyStart = currentFYStart();
    
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E2E5),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Quick Action',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            // Row 1
            Row(
              children: [
                Expanded(child: _buildSmallCard(context, Icons.document_scanner_outlined, 'Smart\nImport', () {
                  Navigator.pop(context);
                  showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => const ImportSheet());
                })),
                const SizedBox(width: 12),
                Expanded(child: _buildSmallCard(context, Icons.edit_note, 'Manual\nEntry', () {
                  Navigator.pop(context);
                  showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => const AddEntrySheet());
                })),
              ],
            ),
            const SizedBox(height: 12),
            
            // Row 2
            Row(
              children: [
                Expanded(child: _buildSmallCard(context, Icons.handshake_outlined, 'Log IOU\nDebt', () {
                  Navigator.pop(context);
                  showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => const AddDebtSheet());
                })),
                const SizedBox(width: 12),
                Expanded(child: _buildSmallCard(context, Icons.summarize_outlined, 'Generate\nReport', () {
                  Navigator.pop(context);
                  showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (ctx) => ExportSheet(fyStart: fyStart));
                })),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWideCard(BuildContext context, IconData icon, String title, String subtitle, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE2E2E5)),
          borderRadius: BorderRadius.circular(20),
          color: const Color(0xFFF4F4F5),
        ),
        child: Row(
          children: [
            Icon(icon, size: 28, color: const Color(0xFF0F0F10)),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F0F10))),
                  const SizedBox(height: 4),
                  Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF64646A))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSmallCard(BuildContext context, IconData icon, String title, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE2E2E5)),
          borderRadius: BorderRadius.circular(20),
          color: const Color(0xFFFFFFFF),
          boxShadow: const [
             BoxShadow(color: Color(0x05000000), blurRadius: 10, offset: Offset(0, 4))
          ]
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 24, color: const Color(0xFF0F0F10)),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF0F0F10), height: 1.2), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

