import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:test/test.dart';
import 'package:nikahsaathi_flutter_foundation/api_client.dart';
import 'package:nikahsaathi_flutter_foundation/platform_contracts.dart';

class FakeClient extends http.BaseClient {
  FakeClient(this.response);

  final http.Response response;
  Map<String, String> lastHeaders = {};

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
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
  });

  test('exposes the platform OAuth login route from the configured base URL', () {
    final api = NikahSaathiApiClient(baseUrl: 'https://example.test');
    expect(api.loginUri.toString(), 'https://example.test/api/oauth/login');
  });
}
