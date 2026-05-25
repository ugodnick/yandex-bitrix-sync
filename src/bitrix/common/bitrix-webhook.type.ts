export enum BitrixCrmEvent {
  ONCRMCONTACTADD = 'ONCRMCONTACTADD',
  ONCRMCONTACTUPDATE = 'ONCRMCONTACTUPDATE',
  ONCRMCONTACTDELETE = 'ONCRMCONTACTDELETE',
  ONCRMDEALADD = 'ONCRMDEALADD',
  ONCRMDEALUPDATE = 'ONCRMDEALUPDATE',
  ONCRMDEALDELETE = 'ONCRMDEALDELETE',
}

export interface BitrixCrmWebhookBody {
  event: BitrixCrmEvent;
  data: {
    FIELDS: {
      ID: string;
    };
  };
  ts: string;
  auth: {
    domain: string;
    client_endpoint: string;
    server_endpoint: string;
    member_id: string;
    application_token: string;
  };
}
