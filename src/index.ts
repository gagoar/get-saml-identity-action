import { getInput, setOutput, setFailed, info, isDebug } from '@actions/core';
import { Identity, SamlIdentifierProvider } from './utils/guards';
import { graphql } from '@octokit/graphql';

const query = (organization: string) => `
query($after: String) {
  organization(login: "${organization}") {
    samlIdentityProvider {
      externalIdentities(first: 100, after: $after) {
        pageInfo {
          hasNextPage
        }
        edges {
          cursor
          identity: node {
            user {
              login
            }
            samlIdentity {
              username
            }
          }
        }
      }
    }
  }
}
`;

type GetAllIdentities = (options: {
  query: string;
  client: typeof graphql;
  after: string | null;
}) => Promise<Identity[]>;

const getAllIdentities: GetAllIdentities = async ({ query, client, after }) => {
  if (isDebug()) {
    info(JSON.stringify({ query, after }, null, 2));
  }

  const response = await client<SamlIdentifierProvider>(query, { after });

  const {
    edges: identities,
    pageInfo: { hasNextPage },
  } = response.organization.samlIdentityProvider.externalIdentities;
  if (hasNextPage) {
    const { cursor } = identities.slice(-1)[0];
    const paginatedIdentities = await getAllIdentities({ client, query, after: cursor });
    return [...identities, ...paginatedIdentities];
  } else {
    return identities;
  }
};
export enum Props {
  github_token = 'github_token',
  organization = 'organization',
  username = 'username',
}

const getParams = () => {
  return Object.keys(Props).reduce((memo, prop) => {
    const value = getInput(prop);
    return value ? { ...memo, [prop]: value } : memo;
  }, {} as Record<keyof typeof Props, string>);
};

export const main = async (): Promise<void> => {
  const { username, organization, github_token: githubToken } = getParams();
  try {
    const client = graphql.defaults({
      headers: {
        authorization: `token ${githubToken}`,
      },
    });

    const allIdentities = await getAllIdentities({ client, query: query(organization), after: null });

    const user = allIdentities.find(({ identity }) => identity.user && identity.user.login === username);
    if (user?.identity.samlIdentity.username) {
      info(`Found a SAML identity for: ${username}: ${JSON.stringify(user, null, 2)}`);
      setOutput('identity', user.identity.samlIdentity.username);
    } else {
      setFailed('We could not find the identity, enable DEBUG=* to see more details into what went wrong!');
    }
  } catch (e) {
    setFailed(e);
  }
};
