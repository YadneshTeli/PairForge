import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'pair_state.dart';

class PairNotifier extends Notifier<PairState> {
  @override
  PairState build() => const PairIdle();

  Future<void> startSession(String matchId) async {
    state = const PairConnecting();
    // TODO: WebRTC signaling — send SDP offer via signaling service
  }

  Future<void> acceptInvite(String sessionId) async {
    state = const PairConnecting();
    // TODO: WebRTC signaling — send SDP answer
  }

  void onConnected(String sessionId) {
    state = PairConnected(sessionId);
  }

  void endSession() {
    // TODO: cleanup WebRTC peer connection
    state = const PairIdle();
  }
}

final pairNotifierProvider =
    NotifierProvider<PairNotifier, PairState>(PairNotifier.new);
