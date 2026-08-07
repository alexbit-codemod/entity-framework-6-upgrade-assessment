using System;

namespace Sample
{
    public class Customer
    {
        public virtual string Name { get; set; }
        public virtual int Age { get; set; }
        public virtual Guid Id { get; set; }
        public virtual DateTime CreatedAt { get; set; }
        public string NonVirtualRef { get; set; }
        public Address NonVirtualNav { get; set; }
        private virtual Address Hidden { get; set; }
    }

    public class Address { }
}
