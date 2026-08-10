import 'package:flutter/material.dart';

/// A generic, reusable pill-shaped segmented control.
class LuxurySegmentedToggle<T> extends StatelessWidget {
  final T value;
  final List<LuxurySegmentItem<T>> items;
  final ValueChanged<T> onChanged;

  const LuxurySegmentedToggle({
    super.key,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: const Color(0xFFF4F4F5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: items.map((item) {
          final selected = value == item.value;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(item.value),
              child: Container(
                margin: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: selected ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: selected
                      ? const [BoxShadow(color: Color(0x1A000000), blurRadius: 4, offset: Offset(0, 2))]
                      : [],
                ),
                child: Center(
                  child: Text(
                    item.label,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: selected ? (item.selectedColor ?? const Color(0xFF121316)) : const Color(0xFF64646A),
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class LuxurySegmentItem<T> {
  final T value;
  final String label;
  final Color? selectedColor;

  LuxurySegmentItem({
    required this.value,
    required this.label,
    this.selectedColor,
  });
}

/// A wrapper around ElevatedButton that correctly styles itself
/// and handles busy/loading states with a white CircularProgressIndicator.
class LuxuryPrimaryButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final bool isBusy;
  final String text;
  final Color? backgroundColor;

  const LuxuryPrimaryButton({
    super.key,
    required this.onPressed,
    this.isBusy = false,
    required this.text,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: isBusy ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor ?? const Color(0xFF121316),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
        child: isBusy
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : Text(
                text,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
      ),
    );
  }
}
