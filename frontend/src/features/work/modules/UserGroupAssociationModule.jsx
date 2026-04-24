import { UserGroupAssociationPage } from '../UserGroupAssociationPage';

export function UserGroupAssociationModule({ selectedUser = null, userContext = null, onUserCacheUpdated = null }) {
  return (
    <UserGroupAssociationPage
      embedded
      selectedUser={selectedUser}
      userContext={userContext}
      onUserCacheUpdated={onUserCacheUpdated}
    />
  );
}

export default UserGroupAssociationModule;
