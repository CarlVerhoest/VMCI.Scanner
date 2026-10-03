import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faKey, faTrash, faUser } from '@fortawesome/free-solid-svg-icons'
import { VMCISelector, VMCITable, type VMCITableColumn } from '../../components/VMCIUIComponents'
import { FormActions, RequiredMark } from '../../components/FormControls'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  adminService,
  MIN_TEMPORARY_PASSWORD_LENGTH,
  type AdminAccount,
  type Role,
} from '../../services/adminService'
import type { Recipient } from '../../services/recipientService'
import { getErrorMessage } from '../../services/apiError'
import { ROUTE_PATHS } from '../../config/routes'
import { ResetPasswordDialog } from './ResetPasswordDialog'

interface FieldErrors {
  email?: string
  firstName?: string
  surName?: string
  role?: string
  temporaryPassword?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** New account (with a temporary password) or edit an existing one, including its recipients. */
function AdminAccountForm() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [roles, setRoles] = useState<Role[]>([])
  const [account, setAccount] = useState<AdminAccount | null>(null)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [surName, setSurName] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [allRoles, existing] = await Promise.all([
          adminService.getRoles(),
          id ? adminService.getAccount(id) : Promise.resolve(null),
        ])
        if (cancelled) return
        setRoles(allRoles)
        if (existing) {
          setAccount(existing)
          setEmail(existing.email)
          setFirstName(existing.firstName)
          setSurName(existing.surName)
          setRole(allRoles.find((r) => r.code === existing.roleCode) ?? null)
        } else {
          setRole(allRoles.find((r) => r.code === 'COWORKER') ?? null)
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Laden van gegevens mislukt'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    if (!email.trim()) errors.email = 'E-mailadres is verplicht.'
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Dit is geen geldig e-mailadres.'
    if (!firstName.trim()) errors.firstName = 'Voornaam is verplicht.'
    if (!surName.trim()) errors.surName = 'Naam is verplicht.'
    if (!role) errors.role = 'Rol is verplicht.'
    if (isNew && temporaryPassword.length < MIN_TEMPORARY_PASSWORD_LENGTH)
      errors.temporaryPassword = `Minstens ${MIN_TEMPORARY_PASSWORD_LENGTH} tekens.`
    return errors
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !role) {
      setError('Corrigeer de gemarkeerde velden.')
      return
    }

    const fields = { email: email.trim(), firstName: firstName.trim(), surName: surName.trim(), roleCode: role.code }
    setIsSaving(true)
    try {
      if (isNew) await adminService.createAccount(fields, temporaryPassword)
      else await adminService.updateAccount(id, fields)
      navigate(ROUTE_PATHS.ADMIN_ACCOUNTS)
    } catch (err) {
      setError(getErrorMessage(err, 'Opslaan van gegevens mislukt'))
      setIsSaving(false)
    }
  }

  const textField = (
    key: 'email' | 'firstName' | 'surName',
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text'
  ) => (
    <div className="mb-3">
      <label htmlFor={key} className="form-label">
        {label}
        <RequiredMark invalid={Boolean(fieldErrors[key])} />
      </label>
      <input
        id={key}
        type={type}
        className={`form-control${fieldErrors[key] ? ' is-invalid' : ''}`}
        value={value}
        disabled={isSaving}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      {fieldErrors[key] && <div className="invalid-feedback">{fieldErrors[key]}</div>}
    </div>
  )

  if (isLoading) {
    return null
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <h1>{isNew ? 'Nieuw account' : `${account?.firstName ?? ''} ${account?.surName ?? ''}`}</h1>
          <p className="text-body-secondary">
            {isNew
              ? 'Geef het tijdelijke wachtwoord persoonlijk door. Bij de eerste aanmelding kiest de gebruiker een eigen wachtwoord.'
              : 'Pas de gegevens van dit account aan.'}
          </p>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="scanner-panel p-3 p-md-4 mb-4">
            <h2 className="h5 mb-3">
              <FontAwesomeIcon icon={faUser} className="me-2 text-body-secondary" />
              Gegevens
            </h2>
            <form onSubmit={handleSubmit} noValidate>
              {textField('firstName', 'Voornaam', firstName, setFirstName)}
              {textField('surName', 'Naam', surName, setSurName)}
              {textField('email', 'E-mailadres', email, setEmail, 'email')}

              <div className="mb-3">
                <label className="form-label">
                  Rol
                  <RequiredMark invalid={Boolean(fieldErrors.role)} />
                </label>
                <VMCISelector
                  options={roles}
                  selectedValue={role}
                  valueLabel="name"
                  isInvalid={Boolean(fieldErrors.role)}
                  disabled={isSaving}
                  onValueChanged={(value) => setRole(value as Role | null)}
                />
              </div>

              {isNew && (
                <div className="mb-3">
                  <label htmlFor="temporaryPassword" className="form-label">
                    Tijdelijk wachtwoord
                    <RequiredMark invalid={Boolean(fieldErrors.temporaryPassword)} />
                  </label>
                  <input
                    id="temporaryPassword"
                    type="text"
                    className={`form-control${fieldErrors.temporaryPassword ? ' is-invalid' : ''}`}
                    value={temporaryPassword}
                    disabled={isSaving}
                    autoComplete="off"
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                  />
                  {fieldErrors.temporaryPassword && (
                    <div className="invalid-feedback">{fieldErrors.temporaryPassword}</div>
                  )}
                </div>
              )}

              <FormActions isSaving={isSaving} onCancel={() => navigate(ROUTE_PATHS.ADMIN_ACCOUNTS)} />
            </form>
          </div>

          {account && (
            <>
              <div className="scanner-panel p-3 p-md-4 mb-4">
                <h2 className="h5 mb-3">
                  <FontAwesomeIcon icon={faKey} className="me-2 text-body-secondary" />
                  Wachtwoord
                </h2>
                <p className="mb-3">
                  {account.mustChangePassword
                    ? 'Dit account heeft nog een tijdelijk wachtwoord.'
                    : 'De gebruiker heeft een eigen wachtwoord gekozen.'}
                </p>
                <button type="button" className="btn btn-outline-primary" onClick={() => setResetting(true)}>
                  Nieuw tijdelijk wachtwoord
                </button>
              </div>

              <RecipientsPanel accountId={account.id} />

              <ResetPasswordDialog
                account={resetting ? account : null}
                onCancel={() => setResetting(false)}
                onDone={(updated) => {
                  setAccount(updated)
                  setResetting(false)
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** The account's mail recipients. Only an administrator can remove one. */
function RecipientsPanel({ accountId }: { accountId: string }) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Recipient | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    adminService.getRecipients(accountId).then(setRecipients, (err) =>
      setError(getErrorMessage(err, 'De ontvangers konden niet geladen worden.'))
    )
  }, [accountId])

  const add = async () => {
    setError(null)
    try {
      const added = await adminService.addRecipient(accountId, newEmail.trim(), newLabel.trim() || null)
      setRecipients((list) => (list.some((r) => r.id === added.id) ? list : [...list, added]))
      setNewEmail('')
      setNewLabel('')
    } catch (err) {
      setError(getErrorMessage(err, 'Het adres kon niet toegevoegd worden.'))
    }
  }

  const remove = async () => {
    if (!removing) return
    setIsRemoving(true)
    try {
      await adminService.removeRecipient(accountId, removing.id)
      setRecipients((list) => list.filter((r) => r.id !== removing.id))
      setRemoving(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Verwijderen mislukt.'))
      setRemoving(null)
    } finally {
      setIsRemoving(false)
    }
  }

  const columns: VMCITableColumn<Recipient>[] = [
    // Wrapped, not truncated: an address is never shown shortened.
    { id: 'label', header: 'Omschrijving', accessorFn: (r) => r.label ?? '', className: 'text-wrap text-break' },
    { id: 'email', header: 'E-mailadres', accessorKey: 'email', className: 'text-wrap text-break' },
    {
      id: 'remove',
      header: '',
      accessorFn: () => '',
      enableSorting: false,
      enableFiltering: false,
      fitContent: true,
      cell: (r) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          aria-label={`${r.email} verwijderen`}
          onClick={() => setRemoving(r)}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      ),
    },
  ]

  return (
    <div className="scanner-panel p-3 p-md-4 mb-4">
      <h2 className="h5 mb-3">
        <FontAwesomeIcon icon={faEnvelope} className="me-2 text-body-secondary" />
        Ontvangers
      </h2>
      <p className="text-body-secondary small">
        De adressen waarnaar deze gebruiker een pdf kan mailen. De gebruiker kan zelf adressen
        toevoegen; alleen een beheerder kan ze verwijderen.
      </p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <VMCITable
        data={recipients}
        columns={columns}
        enableFiltering={false}
        emptyStateText="Nog geen ontvangers."
      />

      <div className="row g-2 align-items-end mt-2">
        <div className="col-12 col-md-5">
          <label htmlFor="recipientEmail" className="form-label">
            E-mailadres
          </label>
          <input
            id="recipientEmail"
            type="email"
            className="form-control"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-4">
          <label htmlFor="recipientLabel" className="form-label">
            Omschrijving
          </label>
          <input
            id="recipientLabel"
            type="text"
            className="form-control"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-3">
          <button type="button" className="btn btn-outline-primary" disabled={!newEmail.trim()} onClick={() => void add()}>
            Toevoegen
          </button>
        </div>
      </div>

      <ConfirmDialog
        show={removing !== null}
        title="Ontvanger verwijderen"
        confirmLabel="Verwijderen"
        isConfirming={isRemoving}
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
        message={`${removing?.email ?? ''} verdwijnt uit de lijst van deze gebruiker.`}
      />
    </div>
  )
}

export default AdminAccountForm
