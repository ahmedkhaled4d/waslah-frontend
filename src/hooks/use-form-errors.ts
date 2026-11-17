import { useState } from 'react'
import { ApiError } from '@/lib/api'

/** Tracks a form-level error and per-field errors from VALIDATION_ERROR responses. */
export function useFormErrors() {
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function reset() {
    setFormError(null)
    setFieldErrors({})
  }

  function capture(error: unknown) {
    if (error instanceof ApiError) {
      const fields = error.fields
      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        setFormError(null)
        return
      }
      setFieldErrors({})
      setFormError(error.message)
      return
    }
    setFieldErrors({})
    setFormError(error instanceof Error ? error.message : 'Something went wrong')
  }

  return { formError, fieldErrors, reset, capture, setFormError }
}
