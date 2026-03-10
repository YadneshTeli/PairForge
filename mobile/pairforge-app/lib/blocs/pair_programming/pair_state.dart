sealed class PairState {
  const PairState();
}

class PairIdle extends PairState {
  const PairIdle();
}

class PairConnecting extends PairState {
  const PairConnecting();
}

class PairConnected extends PairState {
  final String sessionId;
  const PairConnected(this.sessionId);
}

class PairError extends PairState {
  final String message;
  const PairError(this.message);
}
