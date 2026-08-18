// GENERATED from apps/api/prisma/schema.prisma by tools/gen-enums.mjs — DO NOT EDIT.
// Regenerate: pnpm --filter @sinaaty/shared-types gen

/** DB enum `bid_status` */
export const BidStatus = {
  submitted: 'submitted',
  accepted: 'accepted',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  expired: 'expired',
} as const;
export type BidStatus = (typeof BidStatus)[keyof typeof BidStatus];
export const BidStatusValues = Object.values(BidStatus) as BidStatus[];

/** DB enum `dispute_resolution` */
export const DisputeResolution = {
  release_to_provider: 'release_to_provider',
  refund_customer: 'refund_customer',
  split: 'split',
  replace_part: 'replace_part',
  no_action: 'no_action',
} as const;
export type DisputeResolution = (typeof DisputeResolution)[keyof typeof DisputeResolution];
export const DisputeResolutionValues = Object.values(DisputeResolution) as DisputeResolution[];

/** DB enum `dispute_status` */
export const DisputeStatus = {
  open: 'open',
  under_review: 'under_review',
  awaiting_parties: 'awaiting_parties',
  resolved: 'resolved',
  escalated: 'escalated',
  closed: 'closed',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];
export const DisputeStatusValues = Object.values(DisputeStatus) as DisputeStatus[];

/** DB enum `enforcement_status` */
export const EnforcementStatus = {
  preparing: 'preparing',
  filed: 'filed',
  in_progress: 'in_progress',
  settled: 'settled',
  closed: 'closed',
  withdrawn: 'withdrawn',
} as const;
export type EnforcementStatus = (typeof EnforcementStatus)[keyof typeof EnforcementStatus];
export const EnforcementStatusValues = Object.values(EnforcementStatus) as EnforcementStatus[];

/** DB enum `escrow_status` */
export const EscrowStatus = {
  pending: 'pending',
  held: 'held',
  released: 'released',
  refunded: 'refunded',
  frozen: 'frozen',
  split: 'split',
} as const;
export type EscrowStatus = (typeof EscrowStatus)[keyof typeof EscrowStatus];
export const EscrowStatusValues = Object.values(EscrowStatus) as EscrowStatus[];

/** DB enum `fuel_type` */
export const FuelType = {
  petrol: 'petrol',
  diesel: 'diesel',
  hybrid: 'hybrid',
  electric: 'electric',
  other: 'other',
} as const;
export type FuelType = (typeof FuelType)[keyof typeof FuelType];
export const FuelTypeValues = Object.values(FuelType) as FuelType[];

/** DB enum `identity_provider` */
export const IdentityProvider = {
  nafath: 'nafath',
  otp_phone: 'otp_phone',
  email_password: 'email_password',
  apple: 'apple',
  google: 'google',
} as const;
export type IdentityProvider = (typeof IdentityProvider)[keyof typeof IdentityProvider];
export const IdentityProviderValues = Object.values(IdentityProvider) as IdentityProvider[];

/** DB enum `inspection_type` */
export const InspectionType = {
  check_in: 'check_in',
  progress: 'progress',
  quality: 'quality',
  check_out: 'check_out',
  accident: 'accident',
  pre_purchase: 'pre_purchase',
} as const;
export type InspectionType = (typeof InspectionType)[keyof typeof InspectionType];
export const InspectionTypeValues = Object.values(InspectionType) as InspectionType[];

/** DB enum `integration_provider` */
export const IntegrationProvider = {
  nafath: 'nafath',
  nafez: 'nafez',
  najiz: 'najiz',
  zatca: 'zatca',
  psp: 'psp',
  escrow: 'escrow',
  monjez: 'monjez',
  vin_decoder: 'vin_decoder',
  maps: 'maps',
  sms: 'sms',
  whatsapp: 'whatsapp',
  push: 'push',
  ai_vision: 'ai_vision',
  ai_speech: 'ai_speech',
} as const;
export type IntegrationProvider = (typeof IntegrationProvider)[keyof typeof IntegrationProvider];
export const IntegrationProviderValues = Object.values(IntegrationProvider) as IntegrationProvider[];

/** DB enum `integration_status` */
export const IntegrationStatus = {
  pending: 'pending',
  in_flight: 'in_flight',
  succeeded: 'succeeded',
  failed: 'failed',
  dead_letter: 'dead_letter',
} as const;
export type IntegrationStatus = (typeof IntegrationStatus)[keyof typeof IntegrationStatus];
export const IntegrationStatusValues = Object.values(IntegrationStatus) as IntegrationStatus[];

/** DB enum `invoice_status` */
export const InvoiceStatus = {
  draft: 'draft',
  issued: 'issued',
  sent: 'sent',
  partially_paid: 'partially_paid',
  paid: 'paid',
  overdue: 'overdue',
  void: 'void',
  refunded: 'refunded',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
export const InvoiceStatusValues = Object.values(InvoiceStatus) as InvoiceStatus[];

/** DB enum `invoice_type` */
export const InvoiceType = {
  standard_tax: 'standard_tax',
  simplified_tax: 'simplified_tax',
  credit_note: 'credit_note',
  debit_note: 'debit_note',
  proforma: 'proforma',
} as const;
export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType];
export const InvoiceTypeValues = Object.values(InvoiceType) as InvoiceType[];

/** DB enum `kyb_doc_status` */
export const KybDocStatus = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  expired: 'expired',
} as const;
export type KybDocStatus = (typeof KybDocStatus)[keyof typeof KybDocStatus];
export const KybDocStatusValues = Object.values(KybDocStatus) as KybDocStatus[];

/** DB enum `kyb_doc_type` */
export const KybDocType = {
  commercial_registration: 'commercial_registration',
  vat_certificate: 'vat_certificate',
  national_address: 'national_address',
  iban_letter: 'iban_letter',
  municipality_license: 'municipality_license',
  owner_id: 'owner_id',
  other: 'other',
} as const;
export type KybDocType = (typeof KybDocType)[keyof typeof KybDocType];
export const KybDocTypeValues = Object.values(KybDocType) as KybDocType[];

/** DB enum `ledger_account_type` */
export const LedgerAccountType = {
  asset: 'asset',
  liability: 'liability',
  equity: 'equity',
  revenue: 'revenue',
  expense: 'expense',
} as const;
export type LedgerAccountType = (typeof LedgerAccountType)[keyof typeof LedgerAccountType];
export const LedgerAccountTypeValues = Object.values(LedgerAccountType) as LedgerAccountType[];

/** DB enum `media_kind` */
export const MediaKind = {
  image: 'image',
  video: 'video',
  audio: 'audio',
  pdf: 'pdf',
  xml: 'xml',
  other: 'other',
} as const;
export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];
export const MediaKindValues = Object.values(MediaKind) as MediaKind[];

/** DB enum `notification_channel` */
export const NotificationChannel = {
  push: 'push',
  sms: 'sms',
  email: 'email',
  whatsapp: 'whatsapp',
  in_app: 'in_app',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];
export const NotificationChannelValues = Object.values(NotificationChannel) as NotificationChannel[];

/** DB enum `notification_status` */
export const NotificationStatus = {
  queued: 'queued',
  sent: 'sent',
  delivered: 'delivered',
  failed: 'failed',
  read: 'read',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];
export const NotificationStatusValues = Object.values(NotificationStatus) as NotificationStatus[];

/** DB enum `org_member_role` */
export const OrgMemberRole = {
  owner: 'owner',
  manager: 'manager',
  technician: 'technician',
  accountant: 'accountant',
  driver: 'driver',
  fleet_admin: 'fleet_admin',
  fleet_approver: 'fleet_approver',
  fleet_viewer: 'fleet_viewer',
} as const;
export type OrgMemberRole = (typeof OrgMemberRole)[keyof typeof OrgMemberRole];
export const OrgMemberRoleValues = Object.values(OrgMemberRole) as OrgMemberRole[];

/** DB enum `org_status` */
export const OrgStatus = {
  draft: 'draft',
  pending_kyb: 'pending_kyb',
  active: 'active',
  suspended: 'suspended',
  closed: 'closed',
} as const;
export type OrgStatus = (typeof OrgStatus)[keyof typeof OrgStatus];
export const OrgStatusValues = Object.values(OrgStatus) as OrgStatus[];

/** DB enum `org_type` */
export const OrgType = {
  workshop: 'workshop',
  factory: 'factory',
  service_center: 'service_center',
  body_shop: 'body_shop',
  parts_dealer: 'parts_dealer',
  parts_distributor: 'parts_distributor',
  parts_brand_agent: 'parts_brand_agent',
  scrapyard: 'scrapyard',
  fleet_company: 'fleet_company',
  logistics: 'logistics',
  inspection_center: 'inspection_center',
} as const;
export type OrgType = (typeof OrgType)[keyof typeof OrgType];
export const OrgTypeValues = Object.values(OrgType) as OrgType[];

/** DB enum `part_condition` */
export const PartCondition = {
  oem_new: 'oem_new',
  aftermarket_new: 'aftermarket_new',
  used_scrapyard: 'used_scrapyard',
  refurbished: 'refurbished',
} as const;
export type PartCondition = (typeof PartCondition)[keyof typeof PartCondition];
export const PartConditionValues = Object.values(PartCondition) as PartCondition[];

/** DB enum `part_order_source` */
export const PartOrderSource = {
  reverse_auction: 'reverse_auction',
  catalog_buy_now: 'catalog_buy_now',
  group_buy: 'group_buy',
  trade_reorder: 'trade_reorder',
} as const;
export type PartOrderSource = (typeof PartOrderSource)[keyof typeof PartOrderSource];
export const PartOrderSourceValues = Object.values(PartOrderSource) as PartOrderSource[];

/** DB enum `part_order_status` */
export const PartOrderStatus = {
  pending_payment: 'pending_payment',
  paid: 'paid',
  preparing: 'preparing',
  shipped: 'shipped',
  delivered: 'delivered',
  installed: 'installed',
  confirmed: 'confirmed',
  returned: 'returned',
  cancelled: 'cancelled',
  disputed: 'disputed',
} as const;
export type PartOrderStatus = (typeof PartOrderStatus)[keyof typeof PartOrderStatus];
export const PartOrderStatusValues = Object.values(PartOrderStatus) as PartOrderStatus[];

/** DB enum `part_request_status` */
export const PartRequestStatus = {
  open: 'open',
  bidding: 'bidding',
  awarded: 'awarded',
  fulfilled: 'fulfilled',
  expired: 'expired',
  cancelled: 'cancelled',
} as const;
export type PartRequestStatus = (typeof PartRequestStatus)[keyof typeof PartRequestStatus];
export const PartRequestStatusValues = Object.values(PartRequestStatus) as PartRequestStatus[];

/** DB enum `part_serial_status` */
export const PartSerialStatus = {
  in_stock: 'in_stock',
  sold: 'sold',
  installed: 'installed',
  claimed: 'claimed',
  returned: 'returned',
  void: 'void',
} as const;
export type PartSerialStatus = (typeof PartSerialStatus)[keyof typeof PartSerialStatus];
export const PartSerialStatusValues = Object.values(PartSerialStatus) as PartSerialStatus[];

/** DB enum `payment_method` */
export const PaymentMethod = {
  mada: 'mada',
  apple_pay: 'apple_pay',
  visa: 'visa',
  mastercard: 'mastercard',
  sadad: 'sadad',
  bank_transfer: 'bank_transfer',
  cash: 'cash',
  wallet: 'wallet',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PaymentMethodValues = Object.values(PaymentMethod) as PaymentMethod[];

/** DB enum `payment_status` */
export const PaymentStatus = {
  initiated: 'initiated',
  pending: 'pending',
  authorized: 'authorized',
  captured: 'captured',
  failed: 'failed',
  cancelled: 'cancelled',
  refunded: 'refunded',
  partially_refunded: 'partially_refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export const PaymentStatusValues = Object.values(PaymentStatus) as PaymentStatus[];

/** DB enum `payment_terms` */
export const PaymentTerms = {
  prepaid: 'prepaid',
  on_delivery: 'on_delivery',
  deferred: 'deferred',
  installments: 'installments',
  fleet_monthly: 'fleet_monthly',
} as const;
export type PaymentTerms = (typeof PaymentTerms)[keyof typeof PaymentTerms];
export const PaymentTermsValues = Object.values(PaymentTerms) as PaymentTerms[];

/** DB enum `payout_status` */
export const PayoutStatus = {
  scheduled: 'scheduled',
  processing: 'processing',
  paid: 'paid',
  failed: 'failed',
  cancelled: 'cancelled',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];
export const PayoutStatusValues = Object.values(PayoutStatus) as PayoutStatus[];

/** DB enum `platform_role` */
export const PlatformRole = {
  none: 'none',
  support: 'support',
  ops: 'ops',
  finance: 'finance',
  compliance: 'compliance',
  super_admin: 'super_admin',
} as const;
export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];
export const PlatformRoleValues = Object.values(PlatformRole) as PlatformRole[];

/** DB enum `pn_status` */
export const PnStatus = {
  draft: 'draft',
  pending_consent: 'pending_consent',
  issued: 'issued',
  partially_settled: 'partially_settled',
  closed: 'closed',
  cancelled: 'cancelled',
  rejected: 'rejected',
  in_enforcement: 'in_enforcement',
  enforced: 'enforced',
} as const;
export type PnStatus = (typeof PnStatus)[keyof typeof PnStatus];
export const PnStatusValues = Object.values(PnStatus) as PnStatus[];

/** DB enum `signature_method` */
export const SignatureMethod = {
  nafath: 'nafath',
  otp: 'otp',
  in_app_biometric: 'in_app_biometric',
  manual: 'manual',
} as const;
export type SignatureMethod = (typeof SignatureMethod)[keyof typeof SignatureMethod];
export const SignatureMethodValues = Object.values(SignatureMethod) as SignatureMethod[];

/** DB enum `subscription_status` */
export const SubscriptionStatus = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  cancelled: 'cancelled',
  expired: 'expired',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
export const SubscriptionStatusValues = Object.values(SubscriptionStatus) as SubscriptionStatus[];

/** DB enum `trade_account_status` */
export const TradeAccountStatus = {
  pending: 'pending',
  active: 'active',
  on_hold: 'on_hold',
  closed: 'closed',
} as const;
export type TradeAccountStatus = (typeof TradeAccountStatus)[keyof typeof TradeAccountStatus];
export const TradeAccountStatusValues = Object.values(TradeAccountStatus) as TradeAccountStatus[];

/** DB enum `transport_status` */
export const TransportStatus = {
  requested: 'requested',
  assigned: 'assigned',
  en_route_pickup: 'en_route_pickup',
  picked_up: 'picked_up',
  en_route_dropoff: 'en_route_dropoff',
  delivered: 'delivered',
  cancelled: 'cancelled',
  failed: 'failed',
} as const;
export type TransportStatus = (typeof TransportStatus)[keyof typeof TransportStatus];
export const TransportStatusValues = Object.values(TransportStatus) as TransportStatus[];

/** DB enum `transport_type` */
export const TransportType = {
  flatbed_tow: 'flatbed_tow',
  wheel_lift_tow: 'wheel_lift_tow',
  parts_delivery: 'parts_delivery',
  heavy_tow: 'heavy_tow',
} as const;
export type TransportType = (typeof TransportType)[keyof typeof TransportType];
export const TransportTypeValues = Object.values(TransportType) as TransportType[];

/** DB enum `user_status` */
export const UserStatus = {
  pending: 'pending',
  active: 'active',
  suspended: 'suspended',
  deleted: 'deleted',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export const UserStatusValues = Object.values(UserStatus) as UserStatus[];

/** DB enum `vehicle_event_type` */
export const VehicleEventType = {
  work_order: 'work_order',
  part_installed: 'part_installed',
  inspection: 'inspection',
  accident_report: 'accident_report',
  warranty_issued: 'warranty_issued',
  warranty_claim: 'warranty_claim',
  ownership_note: 'ownership_note',
  odometer: 'odometer',
} as const;
export type VehicleEventType = (typeof VehicleEventType)[keyof typeof VehicleEventType];
export const VehicleEventTypeValues = Object.values(VehicleEventType) as VehicleEventType[];

/** DB enum `vehicle_owner_type` */
export const VehicleOwnerType = {
  user: 'user',
  organization: 'organization',
} as const;
export type VehicleOwnerType = (typeof VehicleOwnerType)[keyof typeof VehicleOwnerType];
export const VehicleOwnerTypeValues = Object.values(VehicleOwnerType) as VehicleOwnerType[];

/** DB enum `warranty_claim_status` */
export const WarrantyClaimStatus = {
  open: 'open',
  under_review: 'under_review',
  approved_replace: 'approved_replace',
  approved_refund: 'approved_refund',
  rejected: 'rejected',
  closed: 'closed',
} as const;
export type WarrantyClaimStatus = (typeof WarrantyClaimStatus)[keyof typeof WarrantyClaimStatus];
export const WarrantyClaimStatusValues = Object.values(WarrantyClaimStatus) as WarrantyClaimStatus[];

/** DB enum `warranty_status` */
export const WarrantyStatus = {
  active: 'active',
  claimed: 'claimed',
  replaced: 'replaced',
  refunded: 'refunded',
  expired: 'expired',
  void: 'void',
} as const;
export type WarrantyStatus = (typeof WarrantyStatus)[keyof typeof WarrantyStatus];
export const WarrantyStatusValues = Object.values(WarrantyStatus) as WarrantyStatus[];

/** DB enum `wo_item_type` */
export const WoItemType = {
  labor: 'labor',
  part: 'part',
  paint: 'paint',
  towing: 'towing',
  storage: 'storage',
  diagnostic: 'diagnostic',
  other: 'other',
} as const;
export type WoItemType = (typeof WoItemType)[keyof typeof WoItemType];
export const WoItemTypeValues = Object.values(WoItemType) as WoItemType[];

/** DB enum `work_order_source` */
export const WorkOrderSource = {
  workshop: 'workshop',
  customer_request: 'customer_request',
  fleet_po: 'fleet_po',
  accident_claim: 'accident_claim',
} as const;
export type WorkOrderSource = (typeof WorkOrderSource)[keyof typeof WorkOrderSource];
export const WorkOrderSourceValues = Object.values(WorkOrderSource) as WorkOrderSource[];

/** DB enum `work_order_status` */
export const WorkOrderStatus = {
  draft: 'draft',
  received: 'received',
  inspecting: 'inspecting',
  awaiting_approval: 'awaiting_approval',
  awaiting_parts: 'awaiting_parts',
  in_progress: 'in_progress',
  quality_check: 'quality_check',
  ready: 'ready',
  delivered: 'delivered',
  closed: 'closed',
  cancelled: 'cancelled',
  disputed: 'disputed',
  abandoned: 'abandoned',
} as const;
export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];
export const WorkOrderStatusValues = Object.values(WorkOrderStatus) as WorkOrderStatus[];

/** DB enum `zatca_status` */
export const ZatcaStatus = {
  not_required: 'not_required',
  pending: 'pending',
  cleared: 'cleared',
  reported: 'reported',
  rejected: 'rejected',
  failed: 'failed',
} as const;
export type ZatcaStatus = (typeof ZatcaStatus)[keyof typeof ZatcaStatus];
export const ZatcaStatusValues = Object.values(ZatcaStatus) as ZatcaStatus[];

export const DB_ENUMS = {
  bid_status: BidStatusValues,
  dispute_resolution: DisputeResolutionValues,
  dispute_status: DisputeStatusValues,
  enforcement_status: EnforcementStatusValues,
  escrow_status: EscrowStatusValues,
  fuel_type: FuelTypeValues,
  identity_provider: IdentityProviderValues,
  inspection_type: InspectionTypeValues,
  integration_provider: IntegrationProviderValues,
  integration_status: IntegrationStatusValues,
  invoice_status: InvoiceStatusValues,
  invoice_type: InvoiceTypeValues,
  kyb_doc_status: KybDocStatusValues,
  kyb_doc_type: KybDocTypeValues,
  ledger_account_type: LedgerAccountTypeValues,
  media_kind: MediaKindValues,
  notification_channel: NotificationChannelValues,
  notification_status: NotificationStatusValues,
  org_member_role: OrgMemberRoleValues,
  org_status: OrgStatusValues,
  org_type: OrgTypeValues,
  part_condition: PartConditionValues,
  part_order_source: PartOrderSourceValues,
  part_order_status: PartOrderStatusValues,
  part_request_status: PartRequestStatusValues,
  part_serial_status: PartSerialStatusValues,
  payment_method: PaymentMethodValues,
  payment_status: PaymentStatusValues,
  payment_terms: PaymentTermsValues,
  payout_status: PayoutStatusValues,
  platform_role: PlatformRoleValues,
  pn_status: PnStatusValues,
  signature_method: SignatureMethodValues,
  subscription_status: SubscriptionStatusValues,
  trade_account_status: TradeAccountStatusValues,
  transport_status: TransportStatusValues,
  transport_type: TransportTypeValues,
  user_status: UserStatusValues,
  vehicle_event_type: VehicleEventTypeValues,
  vehicle_owner_type: VehicleOwnerTypeValues,
  warranty_claim_status: WarrantyClaimStatusValues,
  warranty_status: WarrantyStatusValues,
  wo_item_type: WoItemTypeValues,
  work_order_source: WorkOrderSourceValues,
  work_order_status: WorkOrderStatusValues,
  zatca_status: ZatcaStatusValues,
} as const;
