import { Schema } from "effect";

export const UserId = Schema.Int.pipe(Schema.brand("UserId"));
export type UserId = typeof UserId.Type;

/** The signed-in person, as the backend's `/auth/me` returns them. */
export const User = Schema.Struct({
  id: UserId,
  username: Schema.String,
  email: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  image: Schema.String,
});
export type User = typeof User.Type;
