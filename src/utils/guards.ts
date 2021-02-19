import { isPlainObject } from 'is-plain-object';
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isObject = (o: unknown): o is { [name: string]: unknown } => isPlainObject(o);
export type Identity = {
  cursor: string;
  identity: {
    user: { login: string };
    samlIdentity: {
      username: string;
    };
  };
};

export type SamlIdentifierProvider = {
  organization: {
    samlIdentityProvider: {
      externalIdentities: { edges: Identity[]; pageInfo: { hasNextPage: boolean | null } };
    };
  };
};

export const isSamlIdentifierProvider = (response: unknown): response is SamlIdentifierProvider => {
  return (
    isObject(response) &&
    isObject(response.organization) &&
    isObject(response.organization.samlIdentifierProvider) &&
    Array.isArray(response.organization.samlIdentifierProvider.externalIdentities)
  );
};
