SELECT unnest(enum_range(NULL::"PaymentMethod"))::text;
