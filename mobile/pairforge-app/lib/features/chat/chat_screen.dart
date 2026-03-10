import 'package:flutter/material.dart';

class ChatScreen extends StatelessWidget {
  /// When [matchId] is provided, opens the chat for that specific match.
  /// When null, shows the full matches/chat list.
  final String? matchId;

  const ChatScreen({super.key, this.matchId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(matchId != null ? 'Chat' : 'Messages'),
      ),
      body: Center(
        child: Text(matchId != null ? 'Chat — $matchId' : 'Chat Screen'),
      ),
    );
  }
}
