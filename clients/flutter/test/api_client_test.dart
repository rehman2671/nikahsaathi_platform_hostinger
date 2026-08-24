import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:test/test.dart';
import 'package:nikahsaathi_flutter_foundation/api_client.dart';
import 'package:nikahsaathi_flutter_foundation/platform_contracts.dart';

class FakeClient extends http.BaseClient {
  FakeClient(this.response);

  final http.Response response;
  String? lastMethod;
  Uri? lastUri;
  Map<String, String> lastHeaders = {};

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    lastMethod = request.method;
    lastUri = request.url;
    lastHeaders = request.headers;
    return http.StreamedResponse(
      Stream<List<int>>.value(utf8.encode(response.body)),
      response.statusCode,
      headers: response.headers,
    );
  }
}

void main() {
  test('maps server error codes to typed ApiErrorCode values', () {
    expect(const NikahSaathiApiException('FORBIDDEN', 'blocked').typedCode, ApiErrorCode.forbidden);
    expect(const NikahSaathiApiException('unknown', 'failed').typedCode, ApiErrorCode.requestFailed);
  });

  test('returns an unauthenticated session for a protected 401 response', () async {
    final client = FakeClient(http.Response(jsonEncode({'error': {'data': {'code': 'UNAUTHORIZED'}, 'message': 'Login required'}}), 401));
    final api = NikahSaathiApiClient(baseUrl: 'https://example.test', sessionCookie: 'session=abc', client: client);
    final session = await api.getSession();
    expect(session.isAuthenticated, isFalse);
    expect(client.lastHeaders['cookie'], 'session=abc');
    expect(client.lastMethod, 'GET');
  });

  test('uses the tRPC GET batch envelope for query procedures', () async {
    final client = FakeClient(http.Response(jsonEncode([
      {'result': {'data': {'json': {'allowed': true, 'action': 'allow', 'highestRisk': 'low', 'maskedText': null, 'safeText': 'hello', 'explanation': null, 'matches': [], 'blockedUrls': []}}}},
    ]), 200));
    final api = NikahSaathiApiClient(baseUrl: 'https://example.test', client: client);
    final decision = await api.evaluateSafety(text: 'hello', surface: 'messages');
    expect(decision.allowed, isTrue);
    expect(decision.action, SafetyAction.allow);
    expect(client.lastMethod, 'GET');
    expect(client.lastUri?.queryParameters['batch'], '1');
  });

  test('exposes the platform OAuth login route from the configured base URL', () {
    final api = NikahSaathiApiClient(baseUrl: 'https://example.test');
    expect(api.loginUri.toString(), 'https://example.test/api/oauth/login');
  });
}
