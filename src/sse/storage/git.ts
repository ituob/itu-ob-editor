export interface GitAuthentication {
  oauth2format?: 'github' | 'gitlab' | 'bitbucket',
  token?: string,
  username?: string,
  password?: string,
}


export interface GitAuthor {
  name?: string,
  email?: string,
}