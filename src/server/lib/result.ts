/** Unwraps a Supabase response: returns `data` or throws the error message. */
export function must<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message)
  if (result.data == null) throw new Error('Not found')
  return result.data as NonNullable<T>
}

/** Same, for writes where only the error matters. */
export function check(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message)
}
