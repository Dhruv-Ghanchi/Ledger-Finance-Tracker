import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/data_providers.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/utils/premium.dart';
import '../../core/widgets/luxury_sheet.dart';
import '../../core/utils/snackbar_utils.dart';

class CategoriesManagerSheet extends ConsumerStatefulWidget {
  const CategoriesManagerSheet({super.key});

  @override
  ConsumerState<CategoriesManagerSheet> createState() => _CategoriesManagerSheetState();
}

class _CategoriesManagerSheetState extends ConsumerState<CategoriesManagerSheet> {
  final TextEditingController _nameController = TextEditingController();
  String _type = 'expense';
  bool _busy = false;

  bool get _isFreeUser => !hasPremiumAccess(ref.read(authProvider).dbUser);

  Future<void> _addCategory() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    if (_isFreeUser) {
      requirePremium(ref);
      return;
    }

    setState(() => _busy = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/categories', data: {'name': name, 'type': _type});
      _nameController.clear();
      bumpDataRefresh(ref);
      if (mounted) showSuccessSnackbar(context, 'Category added');
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Failed to add category');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteCategory(String id) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.delete('/categories/$id');
      bumpDataRefresh(ref);
      if (mounted) showSuccessSnackbar(context, 'Category deleted');
    } catch (e) {
      if (mounted) showApiErrorSnackbar(context, e, fallback: 'Failed to delete');
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final isFreeUser = _isFreeUser;

    return LuxuryBottomSheet(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LuxurySheetHeader(
            title: 'Categories',
            subtitle: isFreeUser ? 'Preset categories are locked. Add custom ones with Premium.' : 'Manage your preset and custom categories.',
          ),
          const SizedBox(height: 24),

          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                flex: 3,
                child: TextField(
                  controller: _nameController,
                  enabled: !isFreeUser,
                  decoration: InputDecoration(
                    hintText: 'New Category...',
                    filled: true,
                    fillColor: Colors.white,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<String>(
                  initialValue: _type,
                  isExpanded: true,
                  icon: const Icon(Icons.arrow_drop_down, size: 20),
                  decoration: InputDecoration(
                    isDense: true,
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E2E5))),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'expense', child: Text('Expense', style: TextStyle(fontSize: 14))),
                    DropdownMenuItem(value: 'income', child: Text('Income', style: TextStyle(fontSize: 14))),
                  ],
                  onChanged: isFreeUser ? null : (v) => setState(() => _type = v!),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: (isFreeUser || _busy) ? null : _addCategory,
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF121316),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.all(12),
                ),
                icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.add, size: 20),
              ),
            ],
          ),
          if (isFreeUser)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                'Upgrade to Premium to create custom categories',
                style: TextStyle(color: Colors.amber.shade800, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),

          const SizedBox(height: 24),

          categoriesAsync.when(
            data: (categories) {
              final Set<String> seen = {};
              final filtered = categories.where((c) {
                if (seen.contains(c['name'])) return false;
                seen.add(c['name']);
                return true;
              }).toList();
              
              final expenses = filtered.where((c) => c['type'] == 'expense').toList();
              final incomes = filtered.where((c) => c['type'] == 'income').toList();

              expenses.sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
              incomes.sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));

              return ListView(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  _buildSection('EXPENSE CATEGORIES', expenses, isFreeUser),
                  const SizedBox(height: 24),
                  _buildSection('INCOME CATEGORIES', incomes, isFreeUser),
                  if (isFreeUser) ...[
                    const SizedBox(height: 32),
                    ElevatedButton.icon(
                      onPressed: () => requirePremium(ref),
                      icon: const Icon(Icons.lock_outline, size: 18),
                      label: const Text('Unlock Custom Categories', style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                    ),
                  ],
                  const SizedBox(height: 48),
                ],
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, stack) => Center(child: Text('Error: $err')),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<dynamic> items, bool isFreeUser) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64646A), letterSpacing: 1.2)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xFFE2E2E5)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (c, i) => const Divider(height: 1, color: Color(0xFFF4F4F5)),
            itemBuilder: (context, index) {
              final c = items[index];
              final isPreset = c['is_preset'] == true;

              return ListTile(
                dense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                leading: isPreset 
                  ? Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: const Color(0xFFF4F4F5), borderRadius: BorderRadius.circular(6)),
                      child: const Icon(Icons.lock, size: 14, color: Color(0xFFA1A1AA)),
                    )
                  : Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: const Color(0xFFE0F2FE), borderRadius: BorderRadius.circular(6)),
                      child: const Icon(Icons.category, size: 14, color: Color(0xFF0EA5E9)),
                    ),
                title: Text(c['name'], style: TextStyle(color: isPreset ? const Color(0xFFA1A1AA) : const Color(0xFF18181B), fontWeight: FontWeight.w600)),
                trailing: isPreset
                    ? const Text('Preset', style: TextStyle(fontSize: 11, color: Color(0xFFA1A1AA), fontWeight: FontWeight.bold))
                    : isFreeUser
                        ? const SizedBox.shrink()
                        : IconButton(
                            icon: const Icon(Icons.delete_outline, size: 20, color: Color(0xFFDC2626)),
                            onPressed: () => _deleteCategory(c['id']),
                          ),
              );
            },
          ),
        ),
      ],
    );
  }
}
