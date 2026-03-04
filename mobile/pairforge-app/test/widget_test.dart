import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pairforge_app/main.dart';

void main() {
  testWidgets('PairForge app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: PairForgeApp()),
    );
    expect(find.byType(PairForgeApp), findsOneWidget);
  });
}
