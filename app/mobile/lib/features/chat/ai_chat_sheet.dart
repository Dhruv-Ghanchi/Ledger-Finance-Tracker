import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/workspace_provider.dart';
import '../../core/utils/app_fonts.dart';

class AiChatSheet extends ConsumerStatefulWidget {
  const AiChatSheet({super.key});

  @override
  ConsumerState<AiChatSheet> createState() => _AiChatSheetState();
}

class _AiChatSheetState extends ConsumerState<AiChatSheet> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  List<Map<String, String>> _messages = [
    {"role": "assistant", "content": "Hi! I'm Koin, your AI financial co-pilot. How can I help you today?"}
  ];
  bool _loading = false;

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _submitMessage(String text) async {
    if (text.trim().isEmpty || _loading) return;

    final newMessages = List<Map<String, String>>.from(_messages)..add({"role": "user", "content": text});
    setState(() {
      _messages = newMessages;
      _loading = true;
    });
    _controller.clear();
    _scrollToBottom();

    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/chat', data: {"messages": newMessages});
      
      setState(() {
        _messages.add({"role": "assistant", "content": res.data['response'] ?? "I didn't quite get that."});
      });
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        // Premium gate: revert the just-sent message. The global interceptor
        // opens the upgrade sheet automatically.
        setState(() {
          _messages = List<Map<String, String>>.from(_messages)..removeLast();
        });
      } else if (e.response?.statusCode == 429) {
        setState(() {
          _messages.add({
            "role": "assistant",
            "content": "Rate limit exceeded. Please wait a moment and try again.",
          });
        });
      } else {
        setState(() {
          _messages.add({
            "role": "assistant",
            "content": "Sorry, I encountered an error. Please try again.",
          });
        });
      }
    } catch (e) {
      setState(() {
        _messages.add({"role": "assistant", "content": "Sorry, I encountered an error. Please try again."});
      });
    } finally {
      setState(() {
        _loading = false;
      });
      _scrollToBottom();
    }
  }

  String _stripMarkdown(String text) {
    return text.replaceAll(RegExp(r'\*\*'), '').replaceAll(RegExp(r'\*'), '').replaceAll(RegExp(r'```'), '');
  }

  Widget _buildMessage(Map<String, String> msg, bool isLatest) {
    final isUser = msg['role'] == 'user';
    final theme = Theme.of(context);
    
    String content = msg['content'] ?? '';
    final hasAdvisor = content.contains('[GHANCHI_INVESTMENTS_CARD]');
    
    // Custom tokens emitted by the backend AI agent. Amount / scope prompts
    // become helpful inline hints; the advisor token renders a contact card.
    content = content.replaceAll(RegExp(r'\[AMOUNT_INPUT:(.+?)\]'), '\n(Please enter amounts using normal text)');
    content = content.replaceAll('[SCOPE_TOGGLE]', '\n(Please reply with Personal or Business)');
    content = content.replaceAll('[GHANCHI_INVESTMENTS_CARD]', '');
    content = _stripMarkdown(content).trim();

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        decoration: BoxDecoration(
          color: isUser ? theme.colorScheme.primary : theme.cardColor,
          border: isUser ? null : Border.all(color: theme.dividerColor),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(4),
            bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(16),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (content.isNotEmpty)
              Text(
                content,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isUser ? theme.colorScheme.onPrimary : theme.textTheme.bodyMedium?.color,
                ),
              ),
            if (hasAdvisor) ...[
              const SizedBox(height: 10),
              const _AdvisorCard(),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workspace = ref.watch(workspaceProvider);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: theme.dividerColor)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.smart_toy, color: theme.colorScheme.primary),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('KOIN AI', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, fontFamily: AppFonts.display)),
                        Text('${workspace.label} Workspace', style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                return _buildMessage(_messages[index], index == _messages.length - 1);
              },
            ),
          ),

          if (_loading)
            Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 8),
                    Text('Thinking...', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                  ],
                ),
              ),
            ),

          // Input
          Container(
            padding: EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 12 + MediaQuery.of(context).viewInsets.bottom),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: theme.dividerColor)),
              color: theme.cardColor,
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                      filled: true,
                      fillColor: theme.colorScheme.surface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onSubmitted: _submitMessage,
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: theme.colorScheme.primary,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 18),
                    onPressed: () => _submitMessage(_controller.text),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AdvisorCard extends StatelessWidget {
  const _AdvisorCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const accent = Color(0xFF121316);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: accent.withValues(alpha: 0.25)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Color(0x0D0F52BA),
              border: Border(bottom: BorderSide(color: Color(0x1A0F52BA))),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.apartment, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ghanchi Investments',
                        style: theme.textTheme.titleSmall?.copyWith(color: accent, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Chandrakant B. Ghanchi (16+ Yrs)',
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: const [
                _AdvisorRow(icon: Icons.phone, primary: '+91 9820926446', sub: 'Click to call'),
                SizedBox(height: 4),
                _AdvisorRow(icon: Icons.email_outlined, primary: 'chandrakantlic@gmail.com', sub: 'Click to email'),
                SizedBox(height: 4),
                _AdvisorRow(icon: Icons.language, primary: 'www.ghanchiinvest.com', sub: 'Visit website'),
                SizedBox(height: 4),
                _AdvisorRow(icon: Icons.location_on_outlined, primary: 'Shop No. 27, Sector 11, CBD Belapur, Navi Mumbai', sub: 'Get directions'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AdvisorRow extends StatelessWidget {
  final IconData icon;
  final String primary;
  final String sub;

  const _AdvisorRow({required this.icon, required this.primary, required this.sub});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Colors.grey.shade600),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(primary, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600, fontSize: 13)),
              Text(
                sub,
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey, fontSize: 9, letterSpacing: 0.8),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
