"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/form-field";
import {
  CustomerSearchField,
  type CustomerOption,
} from "@/components/ui/customer-search-field";

export function CustomerPickerField({
  value,
  onChange,
  label = "Customer",
  required,
  disabled,
  placeholder = "Search customer by name, phone, email…",
}: {
  value: string;
  onChange: (customerId: string, option?: CustomerOption) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [pinned, setPinned] = useState<CustomerOption | null>(null);

  useEffect(() => {
    if (!value) setPinned(null);
  }, [value]);

  return (
    <FormField label={label + (required ? "" : " (optional)")}>
      <CustomerSearchField
        value={value}
        selectedOption={pinned}
        enabled={!disabled}
        placeholder={disabled && pinned ? pinned.label : placeholder}
        onSelect={(opt) => {
          setPinned(opt);
          onChange(opt.value, opt);
        }}
        onClear={() => {
          setPinned(null);
          onChange("");
        }}
      />
    </FormField>
  );
}
