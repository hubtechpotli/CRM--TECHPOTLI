"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { SelectedSearchValue } from "@/components/ui/search-dropdown-panel";
import {
  CustomerSearchField,
  type CustomerOption,
} from "@/components/ui/customer-search-field";

export type { CustomerOption };

export function CustomerPickerField({
  value,
  onChange,
  label = "Customer",
  required,
  disabled,
  lockSelection,
  defaultOption,
  placeholder = "Search customer by name, phone, email…",
}: {
  value: string;
  onChange: (customerId: string, option?: CustomerOption) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** When true, show read-only selected customer (no search). */
  lockSelection?: boolean;
  /** Pre-fill display when value is set from context (e.g. customer profile page). */
  defaultOption?: CustomerOption | null;
  placeholder?: string;
}) {
  const [pinned, setPinned] = useState<CustomerOption | null>(() => {
    if (defaultOption && value && defaultOption.value === value) return defaultOption;
    return null;
  });

  const locked = Boolean(lockSelection || (disabled && value));

  useEffect(() => {
    if (!value) {
      setPinned(null);
      return;
    }
    if (defaultOption?.value === value) {
      setPinned(defaultOption);
    }
  }, [value, defaultOption]);

  const resolved =
    pinned?.value === value
      ? pinned
      : defaultOption?.value === value
        ? defaultOption
        : pinned;

  if (locked && value && resolved) {
    return (
      <FormField label={label + (required ? "" : " (optional)")}>
        <SelectedSearchValue label={resolved.label} sublabel={resolved.sublabel} />
      </FormField>
    );
  }

  return (
    <FormField label={label + (required ? "" : " (optional)")}>
      <CustomerSearchField
        value={value}
        selectedOption={resolved}
        enabled={!disabled}
        placeholder={placeholder}
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
