enum CommunityStatus { comingSoon, active, archived }

enum ProfilePlan { free, basic, advanced }

enum SafetyAction { allow, warn, mask, replace, block, quarantine, rateLimit, createCase, escalateHuman }

enum ApiErrorCode { unauthorized, forbidden, badRequest, notFound, requestFailed }

class AuthSession {
  const AuthSession({required this.isAuthenticated, this.userId, this.displayName, this.role});
  final bool isAuthenticated;
  final int? userId;
  final String? displayName;
  final String? role;

  factory AuthSession.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AuthSession(isAuthenticated: false);
    return AuthSession(
      isAuthenticated: true,
      userId: json['id'] as int?,
      displayName: json['name'] as String?,
      role: json['role'] as String?,
    );
  }
}

class CommunitySummary {
  const CommunitySummary({required this.id, required this.name, required this.categoryType, required this.status, required this.canJoin});
  final int id;
  final String name;
  final String categoryType;
  final CommunityStatus status;
  final bool canJoin;
}

class SafetyDecision {
  const SafetyDecision({required this.allowed, required this.action, required this.highestRisk, this.maskedText});
  final bool allowed;
  final SafetyAction action;
  final String highestRisk;
  final String? maskedText;

  factory SafetyDecision.fromJson(Map<String, dynamic> json) => SafetyDecision(
        allowed: json['allowed'] == true,
        action: SafetyAction.values.firstWhere((item) => item.name == _camelCase(json['action'] as String? ?? 'allow'), orElse: () => SafetyAction.allow),
        highestRisk: json['highestRisk'] as String? ?? 'low',
        maskedText: json['maskedText'] as String?,
      );
}

class ProfileProjection {
  const ProfileProjection(this.fields);
  final Map<String, dynamic> fields;

  bool contains(String field) => fields.containsKey(field);
  dynamic operator [](String field) => fields[field];
}

String _camelCase(String value) {
  final parts = value.split('_');
  return parts.first + parts.skip(1).map((part) => part.isEmpty ? '' : part[0].toUpperCase() + part.substring(1)).join();
}
