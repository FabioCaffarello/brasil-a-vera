import { describe, expect, it } from 'vitest'
import { Notification } from '../validators/notification'

describe('Notification', () => {
  it('should start with no errors', () => {
    const notification = new Notification()
    expect(notification.hasErrors()).toBe(false)
    expect(notification.toJSON()).toEqual([])
  })

  it('should add error without field', () => {
    const notification = new Notification()
    notification.addError('some error')
    expect(notification.hasErrors()).toBe(true)
    expect(notification.toJSON()).toEqual([{ _errors: ['some error'] }])
  })

  it('should add error with field', () => {
    const notification = new Notification()
    notification.addError('is required', 'name')
    expect(notification.toJSON()).toEqual([{ name: ['is required'] }])
  })

  it('should accumulate errors on the same field', () => {
    const notification = new Notification()
    notification.addError('is required', 'name')
    notification.addError('must be a string', 'name')
    expect(notification.toJSON()).toEqual([
      { name: ['is required', 'must be a string'] },
    ])
  })

  it('should not add duplicate errors', () => {
    const notification = new Notification()
    notification.addError('is required', 'name')
    notification.addError('is required', 'name')
    expect(notification.toJSON()).toEqual([{ name: ['is required'] }])
  })

  it('should set error replacing existing ones', () => {
    const notification = new Notification()
    notification.addError('old error', 'name')
    notification.setError('new error', 'name')
    expect(notification.toJSON()).toEqual([{ name: ['new error'] }])
  })

  it('should set multiple errors at once', () => {
    const notification = new Notification()
    notification.setError(['error1', 'error2'], 'name')
    expect(notification.toJSON()).toEqual([{ name: ['error1', 'error2'] }])
  })

  it('should copy errors from another notification', () => {
    const notification1 = new Notification()
    notification1.addError('error from 1', 'name')

    const notification2 = new Notification()
    notification2.addError('error from 2', 'email')
    notification2.copyErrors(notification1)

    expect(notification2.toJSON()).toEqual([
      { email: ['error from 2'] },
      { name: ['error from 1'] },
    ])
  })

  it('should handle errors across multiple fields', () => {
    const notification = new Notification()
    notification.addError('is required', 'name')
    notification.addError('is invalid', 'email')
    notification.addError('too short', 'name')

    expect(notification.hasErrors()).toBe(true)
    expect(notification.toJSON()).toEqual([
      { name: ['is required', 'too short'] },
      { email: ['is invalid'] },
    ])
  })
})
