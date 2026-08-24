import 'dart:convert';
import 'package:http/http.dart' as http;
import 'platform_contracts.dart';

class NikahSaathiApiException implements Exception {
  const NikahSaathiApiException(this.code, this.message);
  final String code;
  final String message;

  @override
  String toString() => 'NikahSaathiApiException($code): $message';
}

class NikahSaathiApiClient {
  NikahSaathiApiClient({required this.baseUrl, this.sessionCookie, http.Client? client}) : _client = client ?? http.Client();
  final String baseUrl;
  final String? sessionCookie;
  final http.Client _client;

  Uri get loginUri => Uri.parse('$baseUrl/api/oauth/login');

  Future<AuthSession> getSession() async {
    try {
      final body = await _call('auth.me', {});
      return AuthSession.fromJson(body['user'] is Map ? Map<String, dynamic>.from(body['user'] as Map) : body);
    } on NikahSaathiApiException catch (error) {
      if (error.code == 'UNAUTHORIZED' || error.code == 'FORBIDDEN') return const AuthSession(isAuthenticated: false);
      rethrow;
    }
  }

  Future<SafetyDecision> evaluateSafety({required String text, required String surface}) async {
    final body = await _call('operations.contentSafetyCheck', {'text': text, 'surface': surface});
    return SafetyDecision.fromJson(body);
  }

  Future<ProfileProjection> getProfileProjection({required Map<String, dynamic> profile, required Map<String, bool?> ownerConsent, required Map<String, bool?> ownerPrivacy, String? verificationState, String? relationshipState}) async {
    final body = await _call('operations.profileProjection', {'profile': profile, 'ownerConsent': ownerConsent, 'ownerPrivacy': ownerPrivacy, if (verificationState != null) 'verificationState': verificationState, if (relationshipState != null) 'relationshipState': relationshipState});
    return ProfileProjection(Map<String, dynamic>.from(body['fields'] as Map? ?? const {}));
  }

  Future<List<CommunitySummary>> listCommunities() async {
    final body = await _call('operations.availableCommunities', {});
    final values = (body['communities'] is List ? body['communities'] : body) as List? ?? const [];
    return values.map((item) => CommunitySummary(
      id: item['id'] as int,
      name: item['name'] as String,
      categoryType: item['categoryType'] as String,
      status: CommunityStatus.values.firstWhere((status) => status.name == item['status'], orElse: () => CommunityStatus.comingSoon),
      canJoin: item['canJoin'] == true,
    )).toList();
  }

  Future<Map<String, dynamic>> _call(String procedure, Map<String, dynamic> input) async {
    final response = await _client.post(Uri.parse('$baseUrl/api/trpc/$procedure'), headers: {'content-type': 'application/json', if (sessionCookie != null) 'cookie': sessionCookie!}, body: jsonEncode({'json': input}));
    final decoded = jsonDecode(response.body);
    final envelope = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
    final result = envelope['result'];
    final data = result is Map ? result['data'] : null;
    final payload = data is Map && data.containsKey('json') ? data['json'] : data;
    if (response.statusCode >= 400 || payload is! Map<String, dynamic>) {
      final error = envelope['error'];
      final rawCode = error is Map ? error['data']?['code'] as String? ?? 'REQUEST_FAILED' : 'REQUEST_FAILED';
      throw NikahSaathiApiException(rawCode, error is Map ? error['message'] as String? ?? 'Request failed' : 'Request failed');
    }
    return payload;
  }
}
