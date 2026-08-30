import '../../../core/l10n/app_localizations.dart';
import '../../../core/ui/ui.dart';

/// وسم نوع المنشأة ورمزها — تتقاسمهما قائمة الاستكشاف وملف المنشأة، فلا نسختان تفترقان.
String orgTypeLabel(L10n l, String t) => switch (t) {
      'workshop' => l.orgWorkshop,
      'scrapyard' => l.orgScrapyard,
      'parts_dealer' => l.orgPartsDealer,
      'parts_distributor' => l.orgPartsDistributor,
      'parts_brand_agent' => l.orgPartsBrandAgent,
      _ => l.orgOther,
    };

BrandGlyph orgTypeGlyph(String t) => switch (t) {
      'scrapyard' || 'parts_dealer' || 'parts_distributor' || 'parts_brand_agent' => BrandGlyph.gear,
      _ => BrandGlyph.carRepair,
    };
