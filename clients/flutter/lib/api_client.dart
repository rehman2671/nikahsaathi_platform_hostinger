import 'dart:convert';
import 'package:http/http.dart' as http;
import 'platform_contracts.dart';

class NikahSaathiApiException implements Exception {
  const NikahSaathiApiException(this.code, this.message);
  final String code;
  final String message;

  ApiErrorCode get typedCode {
    switch (code.toUpperCase()) {
      case 'UNAUTHORIZED':
        return ApiErrorCode.unauthorized;
      case 'FORBIDDEN':
        return ApiErrorCode.forbidden;
      case 'BAD_REQUEST':
        return ApiErrorCode.badRequest;
      case 'NOT_FOUND':
        return ApiErrorCode.notFound;
      default:
        return ApiErrorCode.requestFailed;
    }
  }

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
      final user = body is Map && body['user'] is Map ? Map<String, dynamic>.from(body['user'] as Map) : body is Map ? Map<String, dynamic>.from(body) : null;
      return AuthSession.fromJson(user);
    } on NikahSaathiApiException catch (error) {
      if (error.typedCode == ApiErrorCode.unauthorized || error.typedCode == ApiErrorCode.forbidden) return const AuthSession(isAuthenticated: false);
      rethrow;
    }
  }

  Future<SafetyDecision> evaluateSafety({required String text, required String surface}) async {
    final body = await _call('operations.contentSafetyCheck', {'text': text, 'surface': surface});
    return SafetyDecision.fromJson(body);
  }

  Future<ProfileProjection> getProfileProjection({required Map<String, dynamic> profile, required Map<String, bool?> ownerConsent, required Map<String, bool?> ownerPrivacy, String? verificationState, String? relationshipState}) async {
    final body = await _call('operations.profileProjection', {'profile': profile, 'ownerConsent': ownerConsent, 'ownerPrivacy': ownerPrivacy, if (verificationState != null) 'verificationState': verificationState, if (relationshipState != null) 'relationshipState': relationshipState});
    final map = body is Map ? Map<String, dynamic>.from(body) : <String, dynamic>{};
    return ProfileProjection(Map<String, dynamic>.from(map['fields'] as Map? ?? const {}));
  }

  Future<List<CommunitySummary>> listCommunities() async {
    final body = await _call('operations.availableCommunities', {});
    final map = body is Map ? Map<String, dynamic>.from(body) : <String, dynamic>{};
    final values = (map['communities'] is List ? map['communities'] : body is List ? body : const []) as List;
    return values.map((item) => CommunitySummary(
      id: item['id'] as int,
      name: item['name'] as String,
      categoryType: item['categoryType'] as String,
      status: CommunityStatus.values.firstWhere((status) => status.name == item['status'], orElse: () => CommunityStatus.comingSoon),
      canJoin: item['canJoin'] == true,
    )).toList();
  }

  Future<dynamic> _call(String procedure, Map<String, dynamic> input, {bool mutation = false}) async {
    final headers = {'content-type': 'application/json', if (sessionCookie != null) 'cookie': sessionCookie!};
    final response = mutation
        ? await _client.post(Uri.parse('$baseUrl/api/trpc/$procedure'), headers: headers, body: jsonEncode({'json': input}))
        : await _client.get(Uri.parse('$baseUrl/api/trpc/$procedure').replace(queryParameters: {'batch': '1', 'input': jsonEncode({'0': {'json': input}})}), headers: headers);
    final decoded = jsonDecode(response.body);
    final envelope = decoded is List && decoded.isNotEmpty && decoded.first is Map ? decoded.first as Map : decoded is Map ? decoded : <String, dynamic>{};
    final result = envelope['result'];
    final data = result is Map ? result['data'] : null;
    final payload = data is Map && data.containsKey('json') ? data['json'] : data;
    if (response.statusCode >= 400 || envelope['error'] != null) {
      final error = envelope['error'];
      final errorData = error is Map ? error['data'] : null;
      final rawCode = errorData is Map ? errorData['code'] as String? ?? 'REQUEST_FAILED' : 'REQUEST_FAILED';
      throw NikahSaathiApiException(rawCode, error is Map ? error['message'] as String? ?? 'Request failed' : 'Request failed');
    }
    return payload;
  }
}
