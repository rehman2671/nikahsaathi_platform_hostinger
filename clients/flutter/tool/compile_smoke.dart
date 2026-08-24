import 'package:nikahsaathi_flutter_foundation/api_client.dart';

void main() {
  final error = const NikahSaathiApiException('UNAUTHORIZED', 'compile smoke');
  if (error.typedCode.name != 'unauthorized') {
    throw StateError('Typed error mapping is not available');
  }
}
