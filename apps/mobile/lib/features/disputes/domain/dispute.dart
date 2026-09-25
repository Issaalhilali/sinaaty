/// A dispute as the parties see it: what it's about, where it stands, and that the money is held.
class Dispute {
  final String id;
  final String number;
  final String status;       // open | under_review | awaiting_parties | escalated | resolved | closed
  final String category;     // scope | quality | price | delay | damage | part_defect | no_show
  final String descriptionAr;
  final String? workOrderId;
  final String? partOrderId;
  final String? resolution;
  final String? resolutionNoteAr;
  final DateTime createdAt;
  final List<DisputeMessage> messages;
  final List<DisputeMedia> media;
  final ({String status, String amount})? escrow;
  const Dispute({required this.id, required this.number, required this.status, required this.category, required this.descriptionAr, this.workOrderId, this.partOrderId, this.resolution, this.resolutionNoteAr, required this.createdAt, this.messages = const [], this.media = const [], this.escrow});
  bool get live => !const {'resolved', 'closed'}.contains(status);
}

class DisputeMessage {
  final String id; final String? authorUserId; final String? authorNameAr; final String bodyAr; final DateTime createdAt;
  const DisputeMessage({required this.id, this.authorUserId, this.authorNameAr, required this.bodyAr, required this.createdAt});
}

class DisputeMedia { final String mediaId; final String? mimeType; const DisputeMedia({required this.mediaId, this.mimeType}); }

const disputeCategories = ['scope', 'quality', 'price', 'delay', 'damage', 'part_defect', 'no_show'];
