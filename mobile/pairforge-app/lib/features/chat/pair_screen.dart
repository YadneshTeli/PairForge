import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/config/app_config.dart';
import '../../providers/auth_provider.dart';

class PairScreen extends ConsumerStatefulWidget {
  const PairScreen({super.key, required this.matchId});

  final String matchId;

  @override
  ConsumerState<PairScreen> createState() => _PairScreenState();
}

class _PairScreenState extends ConsumerState<PairScreen> {
  final _document = TextEditingController();
  final _local = RTCVideoRenderer();
  final _remote = RTCVideoRenderer();
  io.Socket? _socket;
  RTCPeerConnection? _peer;
  int _revision = 0;
  bool _applying = false;
  String? _cameraError;
  bool _renderersReady = false;

  @override
  void initState() {
    super.initState();
    _open();
  }

  Future<void> _open() async {
    await _local.initialize();
    await _remote.initialize();
    if (!mounted) {
      _local.dispose();
      _remote.dispose();
      return;
    }
    _renderersReady = true;
    final token = ref.read(authStateProvider).token;
    if (token == null) return;
    final socket = io.io(
      AppConfig.wsBaseUrl,
      io.OptionBuilder().setTransports(['websocket']).setAuth({'token': token}).disableAutoConnect().build(),
    );
    socket.on('pairState', _applyDocument);
    socket.on('pairEdit', _applyDocument);
    socket.on('pairSignal', _onSignal);
    socket.onConnect((_) => socket.emit('pairJoin', {'matchId': widget.matchId}));
    socket.connect();
    _socket = socket;
    if (mounted) setState(() {});
  }

  void _applyDocument(dynamic data) {
    if (data is! Map) return;
    _applying = true;
    _revision = (data['revision'] as num?)?.toInt() ?? _revision;
    _document.text = data['document']?.toString() ?? '';
    _applying = false;
    if (mounted) setState(() {});
  }

  Future<RTCPeerConnection> _connection() async {
    if (_peer != null) return _peer!;
    final connection = await createPeerConnection({
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
      ],
    });
    connection.onIceCandidate = (candidate) {
      if (candidate.candidate == null) return;
      _socket?.emit('pairSignal', {
        'matchId': widget.matchId,
        'signal': {
          'candidate': {
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          },
        },
      });
    };
    connection.onTrack = (event) {
      if (event.streams.isEmpty) return;
      _remote.srcObject = event.streams.first;
      if (mounted) setState(() {});
    };
    _peer = connection;
    return connection;
  }

  Future<void> _onSignal(dynamic payload) async {
    if (payload is! Map) return;
    final signal = payload['signal'];
    if (signal is! Map) return;
    final connection = await _connection();
    final sdp = signal['sdp'];
    if (sdp is Map) {
      final description = RTCSessionDescription(sdp['sdp']?.toString() ?? '', sdp['type']?.toString() ?? '');
      await connection.setRemoteDescription(description);
      if (description.type == 'offer') {
        final answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        _socket?.emit('pairSignal', {
          'matchId': widget.matchId,
          'signal': {'sdp': {'type': answer.type, 'sdp': answer.sdp}},
        });
      }
      return;
    }
    final candidate = signal['candidate'];
    if (candidate is Map) {
      await connection.addCandidate(RTCIceCandidate(
        candidate['candidate']?.toString(),
        candidate['sdpMid']?.toString(),
        candidate['sdpMLineIndex'] is num ? (candidate['sdpMLineIndex'] as num).toInt() : null,
      ));
    }
  }

  Future<void> _startVideo() async {
    try {
      final stream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': {'facingMode': 'user'},
      });
      _local.srcObject = stream;
      final connection = await _connection();
      for (final track in stream.getTracks()) {
        await connection.addTrack(track, stream);
      }
      final offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      _socket?.emit('pairSignal', {
        'matchId': widget.matchId,
        'signal': {'sdp': {'type': offer.type, 'sdp': offer.sdp}},
      });
      if (mounted) setState(() => _cameraError = null);
    } catch (err) {
      if (mounted) setState(() => _cameraError = err.toString());
    }
  }

  @override
  void dispose() {
    _socket?.dispose();
    _document.dispose();
    final stream = _local.srcObject;
    stream?.getTracks().forEach((track) => track.stop());
    _peer?.close();
    if (_renderersReady) {
      _local.dispose();
      _remote.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pair session')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('The document stays in sync. Video uses a public STUN server and stays on this call.'),
            const SizedBox(height: 12),
            Expanded(
              child: TextField(
                controller: _document,
                maxLines: null,
                expands: true,
                decoration: const InputDecoration(alignLabelWithHint: true, labelText: 'Shared document'),
                onChanged: (value) {
                  if (_applying) return;
                  _socket?.emit('pairEdit', {
                    'matchId': widget.matchId,
                    'document': value,
                    'revision': _revision,
                  });
                },
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 140,
              child: Row(
                children: [
                  Expanded(child: RTCVideoView(_local, mirror: true)),
                  const SizedBox(width: 8),
                  Expanded(child: RTCVideoView(_remote)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: _startVideo, child: const Text('Start video')),
            if (_cameraError != null) ...[
              const SizedBox(height: 8),
              Text(_cameraError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
          ],
        ),
      ),
    );
  }
}
