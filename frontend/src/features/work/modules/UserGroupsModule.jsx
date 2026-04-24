import { UserGroupAssociationPage } from '../UserGroupAssociationPage';

export function UserGroupsModule({ user = null, userContext = null, onUserCacheUpdated = null }) {
  return (
    <UserGroupAssociationPage
      embedded
      selectedUser={user}
      userContext={userContext}
      onUserCacheUpdated={onUserCacheUpdated}
    />
  );
}

export default UserGroupsModule;
