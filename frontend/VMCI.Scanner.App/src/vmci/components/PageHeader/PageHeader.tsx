import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import clsx from 'clsx'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './PageHeader.css'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

interface HeaderBaseProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title: ReactNode
  icon?: IconDefinition
  /** Short explanation under the title. */
  subtitle?: ReactNode
  /** Buttons on the right (they wrap below the title on phones). */
  actions?: ReactNode
  /** `band`: a coloured bar in the accent colour (e.g. on top of a card). Default `plain`. */
  variant?: 'plain' | 'band'
  /** Heading level, to fit the page outline. */
  headingLevel?: HeadingLevel
  /**
   * On phones the actions move below the title, full width (default `true`). `false` keeps
   * compact actions (icon buttons, a small select) on the title's row.
   */
  stackActions?: boolean
}

const Header = forwardRef<
  HTMLDivElement,
  HeaderBaseProps & { kind: 'page' | 'section'; headingLevel: HeadingLevel }
>(function Header(
  {
    title,
    icon,
    subtitle,
    actions,
    variant = 'plain',
    headingLevel,
    stackActions = true,
    kind,
    className,
    ...rest
  },
  ref,
) {
  const Heading = `h${headingLevel}` as const
  return (
    <div
      ref={ref}
      {...rest}
      className={clsx(
        'vmci-header',
        `vmci-header--${kind}`,
        `vmci-header--${variant}`,
        !stackActions && 'vmci-header--inline-actions',
        className,
      )}
    >
      <div className="vmci-header__text">
        <Heading className="vmci-header__title">
          {icon && <FontAwesomeIcon icon={icon} className="vmci-header__icon" aria-hidden="true" />}
          <span>{title}</span>
        </Heading>
        {subtitle && <div className="vmci-header__subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="vmci-header__actions">{actions}</div>}
    </div>
  )
})

export type PageHeaderProps = HeaderBaseProps

/** Title of a page, with an optional icon, subtitle and actions. Default `<h1>`. */
export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(function PageHeader(
  { headingLevel = 1, ...props },
  ref,
) {
  return <Header ref={ref} kind="page" headingLevel={headingLevel} {...props} />
})

export type SectionHeaderProps = HeaderBaseProps

/** Title of a section within a page or card. Default `<h2>`. */
export const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(function SectionHeader(
  { headingLevel = 2, ...props },
  ref,
) {
  return <Header ref={ref} kind="section" headingLevel={headingLevel} {...props} />
})
