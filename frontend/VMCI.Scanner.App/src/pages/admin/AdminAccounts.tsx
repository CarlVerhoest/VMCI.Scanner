import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faLock, faLockOpen, faPen, faPlus, faUsers } from '@fortawesome/free-solid-svg-icons'
import { VMCIActionMenu, VMCITable, type VMCITableColumn } from '../../components/VMCIUIComponents'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { adminService, type AdminAccount } from '../../services/adminService'
import { getErrorMessage } from '../../services/apiError'
import { useAuth } from '../../contexts/AuthContext'
import { ROUTE_PATHS, adminAccountEditPath } from '../../config/routes'
import { ResetPasswordDialog } from './ResetPasswordDialog'

function statusText(account: AdminAccount): string {
  if (account.isLocked) return 'Geblokkeerd'
  if (account.mustChangePassword) return 'Tijdelijk wachtwoord'
  return 'Actief'
}

function statusClass(account: AdminAccount): string {
  if (account.isLocked) return 'badge text-bg-danger'
  if (account.mustChangePassword) return 'badge text-bg-warning'
  return 'badge text-bg-success'
}

// VMCITable truncates text cells by default; a name or address is never shown shortened, so these
// columns wrap instead.
const WRAP = 'text-wrap text-break'

function AdminAccounts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState<AdminAccount | null>(null)
  const [locking, setLocking] = useState<AdminAccount | null>(null)
  const [isLocking, setIsLocking] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)

  useEffect(() => {
    adminService.getAccounts().then(setAccounts, (err) =>
      setError(getErrorMessage(err, 'De accounts konden niet geladen worden.'))
    )
  }, [])

  const replace = (updated: AdminAccount) =>
    setAccounts((list) => list?.map((a) => (a.id === updated.id ? updated : a)) ?? null)

  const toggleLock = async () => {
    if (!locking) return
    setIsLocking(true)
    try {
      replace(await adminService.setLocked(locking.id, !locking.isLocked))
      setLocking(null)
      setLockError(null)
    } catch (err) {
      setLockError(getErrorMessage(err, 'Wijzigen mislukt.'))
    } finally {
      setIsLocking(false)
    }
  }

  const columns: VMCITableColumn<AdminAccount>[] = [
    {
      id: 'name',
      header: 'Naam',
      accessorFn: (a) => `${a.surName} ${a.firstName}`,
      cell: (a) => `${a.firstName} ${a.surName}`,
      onClick: (a) => navigate(adminAccountEditPath(a.id)),
      className: WRAP,
    },
    { id: 'email', header: 'E-mailadres', accessorKey: 'email', className: WRAP },
    { id: 'role', header: 'Rol', accessorKey: 'roleName', fitContent: true },
    {
      id: 'status',
      header: 'Status',
      accessorFn: statusText,
      cell: (a) => <span className={statusClass(a)}>{statusText(a)}</span>,
      fitContent: true,
    },
    {
      id: 'actions',
      header: '',
      accessorFn: () => '',
      enableSorting: false,
      enableFiltering: false,
      fitContent: true,
      cell: (a) => (
        <VMCIActionMenu dataObject={a}>
          <VMCIActionMenu.Item label="Bewerken" icon={faPen} onClick={(x: AdminAccount) => navigate(adminAccountEditPath(x.id))} />
          <VMCIActionMenu.Item label="Nieuw tijdelijk wachtwoord" icon={faKey} onClick={setResetting} />
          <VMCIActionMenu.Item
            label={a.isLocked ? 'Deblokkeren' : 'Blokkeren'}
            icon={a.isLocked ? faLockOpen : faLock}
            hidden={a.id === user?.id}
            onClick={setLocking}
          />
        </VMCIActionMenu>
      ),
    },
  ]

  return (
    <div className="container mt-4">
      <h1>
        <FontAwesomeIcon icon={faUsers} className="me-2 text-body-secondary" />
        Accounts
      </h1>
      <p className="text-body-secondary">
        Maak een account aan met een tijdelijk wachtwoord en geef dat persoonlijk door. Bij de eerste
        aanmelding kiest de gebruiker een eigen wachtwoord.
      </p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {accounts && (
        <VMCITable
          data={accounts}
          columns={columns}
          emptyStateText="Er zijn nog geen accounts."
          initialSorting={[{ id: 'name', desc: false }]}
          onRowDoubleClick={(a) => navigate(adminAccountEditPath(a.id))}
          toolbarStart={
            <button type="button" className="btn btn-primary" onClick={() => navigate(ROUTE_PATHS.ADMIN_ACCOUNT_NEW)}>
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Nieuw account
            </button>
          }
        />
      )}

      <ResetPasswordDialog
        account={resetting}
        onCancel={() => setResetting(null)}
        onDone={(updated) => {
          replace(updated)
          setResetting(null)
        }}
      />

      <ConfirmDialog
        show={locking !== null}
        title={locking?.isLocked ? 'Account deblokkeren' : 'Account blokkeren'}
        variant={locking?.isLocked ? 'primary' : 'danger'}
        confirmLabel={locking?.isLocked ? 'Deblokkeren' : 'Blokkeren'}
        isConfirming={isLocking}
        error={lockError}
        onConfirm={() => void toggleLock()}
        onCancel={() => {
          setLocking(null)
          setLockError(null)
        }}
        message={
          locking?.isLocked
            ? `${locking.firstName} ${locking.surName} kan zich weer aanmelden.`
            : `${locking?.firstName} ${locking?.surName} wordt meteen op alle toestellen afgemeld en kan zich niet meer aanmelden.`
        }
      />
    </div>
  )
}

export default AdminAccounts
